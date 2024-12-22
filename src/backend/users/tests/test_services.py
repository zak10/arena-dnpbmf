"""
Comprehensive test suite for UserService functionality including authentication,
authorization, and security controls.

Tests cover:
- Magic link authentication with rate limiting
- Google OAuth authentication
- Role-based access control
- Secure profile management
- Data classification and encryption

Version: 1.0.0
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from freezegun import freeze_time
from faker import Faker

from users.services import UserService
from users.tests.factories import BuyerFactory, ArenaStaffFactory
from notifications.email import EmailService
from core.constants import DataClassification
from core.exceptions import AuthenticationError, SystemError
from core.utils.encryption import encrypt_data

# Initialize faker for test data
faker = Faker()
faker.seed_instance(12345)

class TestUserService:
    """Comprehensive test suite for UserService functionality."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test environment with mocks and fixtures."""
        self.email_service = Mock(spec=EmailService)
        self.rate_limiter = Mock()
        self.user_service = UserService(
            email_service=self.email_service,
            rate_limiter=self.rate_limiter
        )
        self.test_ip = "192.168.1.1"

    @pytest.mark.django_db
    @patch('notifications.email.EmailService.send_magic_link')
    def test_create_magic_link_success(self, mock_send_magic_link):
        """Test successful magic link creation with business email."""
        # Arrange
        test_email = "user@company.com"
        
        # Act
        result = self.user_service.create_magic_link(test_email, self.test_ip)

        # Assert
        assert result is True
        mock_send_magic_link.assert_called_once()
        call_args = mock_send_magic_link.call_args[1]
        assert call_args['email'] == test_email
        assert 'magic_link_url' in call_args
        assert len(call_args['magic_link_url'].split('token=')[1]) > 0

    @pytest.mark.django_db
    @patch('users.services.UserService.check_rate_limit')
    def test_create_magic_link_rate_limit_exceeded(self, mock_check_rate_limit):
        """Test rate limiting for magic link creation."""
        # Arrange
        test_email = "user@company.com"
        mock_check_rate_limit.side_effect = AuthenticationError(
            message="Too many authentication attempts",
            code="E1001"
        )

        # Act & Assert
        with pytest.raises(AuthenticationError) as exc:
            self.user_service.create_magic_link(test_email, self.test_ip)
        assert exc.value.code == "E1001"
        assert "Too many authentication attempts" in str(exc.value)

    @pytest.mark.django_db
    def test_create_magic_link_invalid_email(self):
        """Test magic link creation with invalid email format."""
        # Arrange
        invalid_email = "invalid.email"

        # Act & Assert
        with pytest.raises(AuthenticationError) as exc:
            self.user_service.create_magic_link(invalid_email, self.test_ip)
        assert exc.value.code == "E1001"
        assert "Invalid business email domain" in str(exc.value)

    @pytest.mark.django_db
    @freeze_time("2023-01-01 12:00:00")
    def test_verify_magic_link_success(self):
        """Test successful magic link verification."""
        # Arrange
        test_email = "user@company.com"
        token_data = {
            "email": test_email,
            "exp": datetime.utcnow() + timedelta(minutes=15),
            "type": "magic_link"
        }
        token = self.user_service._generate_token(token_data)

        # Act
        user = self.user_service.verify_magic_link(token, self.test_ip)

        # Assert
        assert user.email == test_email
        assert user.last_login is not None
        self.email_service.send_login_notification.assert_called_once_with(
            email=test_email,
            ip_address=self.test_ip
        )

    @pytest.mark.django_db
    @freeze_time("2023-01-01 12:00:00")
    def test_verify_magic_link_expired(self):
        """Test expired magic link verification."""
        # Arrange
        test_email = "user@company.com"
        token_data = {
            "email": test_email,
            "exp": datetime.utcnow() - timedelta(minutes=1),
            "type": "magic_link"
        }
        token = self.user_service._generate_token(token_data)

        # Act & Assert
        with pytest.raises(AuthenticationError) as exc:
            self.user_service.verify_magic_link(token, self.test_ip)
        assert exc.value.code == "E1003"
        assert "Invalid or expired magic link" in str(exc.value)

    @pytest.mark.django_db
    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_authenticate_google_success(self, mock_verify_token):
        """Test successful Google OAuth authentication."""
        # Arrange
        test_email = "user@company.com"
        mock_verify_token.return_value = {
            "email": test_email,
            "name": "Test User"
        }

        # Act
        user = self.user_service.authenticate_google("test_code", self.test_ip)

        # Assert
        assert user.email == test_email
        assert user.is_buyer()
        assert user.data_classification == DataClassification.HIGHLY_SENSITIVE.value

    @pytest.mark.django_db
    def test_update_user_profile_success(self):
        """Test successful user profile update with encryption."""
        # Arrange
        user = BuyerFactory.create()
        profile_data = {
            "full_name": faker.name(),
            "company": faker.company(),
            "phone": faker.phone_number(),
            "position": "CTO"
        }

        # Act
        updated_user = self.user_service.update_user_profile(user, profile_data)

        # Assert
        assert updated_user.full_name == profile_data["full_name"]
        # Verify sensitive fields are encrypted
        for field in ["company", "phone", "position"]:
            encrypted_value = getattr(updated_user, field)
            assert encrypted_value != profile_data[field]
            decrypted = self.user_service._decrypt_field(encrypted_value)
            assert decrypted == profile_data[field]

    @pytest.mark.django_db
    def test_update_user_profile_invalid_fields(self):
        """Test profile update with invalid fields."""
        # Arrange
        user = BuyerFactory.create()
        invalid_data = {
            "invalid_field": "test",
            "role": "admin"  # Attempt to change role
        }

        # Act & Assert
        with pytest.raises(SystemError) as exc:
            self.user_service.update_user_profile(user, invalid_data)
        assert exc.value.code == "E4001"
        assert "Invalid profile fields" in str(exc.value)

    @pytest.mark.django_db
    def test_get_user_by_email_with_caching(self):
        """Test user retrieval with caching."""
        # Arrange
        user = BuyerFactory.create()
        cache_key = f"user:{user.email}"

        # Act - First call should hit database
        result1 = self.user_service.get_user_by_email(user.email)
        # Second call should hit cache
        result2 = self.user_service.get_user_by_email(user.email)

        # Assert
        assert result1 == user
        assert result2 == user
        cached_user = self.user_service._cache.get(cache_key)
        assert cached_user == user

    @pytest.mark.django_db
    def test_role_based_access_control(self):
        """Test role-based access control for buyers and staff."""
        # Arrange
        buyer = BuyerFactory.create()
        staff = ArenaStaffFactory.create()

        # Assert
        assert buyer.is_buyer()
        assert not buyer.is_arena_staff()
        assert not buyer.is_staff

        assert staff.is_arena_staff()
        assert not staff.is_buyer()
        assert staff.is_staff

    @pytest.mark.django_db
    def test_data_classification_enforcement(self):
        """Test data classification enforcement for user data."""
        # Arrange
        user = BuyerFactory.create()
        
        # Act & Assert
        assert user.data_classification == DataClassification.HIGHLY_SENSITIVE.value
        
        # Attempt to change classification
        with pytest.raises(SystemError):
            user.data_classification = DataClassification.PUBLIC.value
            user.save()