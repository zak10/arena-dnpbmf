"""
Unit tests for User model and UserManager classes.

Tests cover:
- User creation and validation
- Role-based access control
- Data classification and security
- Email validation and domain restrictions

Version: 1.0.0
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from users.models import User, USER_ROLES
from users.tests.factories import UserFactory, BuyerFactory, ArenaStaffFactory
from core.constants import DataClassification

# Test data constants
VALID_TEST_EMAIL = "test@company.com"
INVALID_TEST_EMAIL = "test@competitor.com"
RESTRICTED_DOMAINS = ["competitor.com", "restricted.org"]
TEST_DATA_CLASSIFICATIONS = [
    DataClassification.HIGHLY_SENSITIVE.value,
    DataClassification.SENSITIVE.value,
    DataClassification.PUBLIC.value
]

class UserModelTests(TestCase):
    """Test cases for User model functionality including security and data classification."""

    def setUp(self):
        """Initialize test case with security configurations."""
        self.valid_user_data = {
            'email': VALID_TEST_EMAIL,
            'full_name': 'Test User',
            'company': 'Test Company',
            'role': USER_ROLES['BUYER'],
            'data_classification': DataClassification.HIGHLY_SENSITIVE.value
        }

    def test_create_user_basic(self):
        """Test basic user creation with required fields."""
        user = User.objects.create_user(**self.valid_user_data)
        
        self.assertEqual(user.email, VALID_TEST_EMAIL.lower())
        self.assertEqual(user.role, USER_ROLES['BUYER'])
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertEqual(
            user.data_classification,
            DataClassification.HIGHLY_SENSITIVE.value
        )

    def test_create_user_email_validation(self):
        """Test email validation and domain restrictions."""
        # Test invalid email format
        with self.assertRaises(ValidationError):
            User.objects.create_user(
                email="invalid-email",
                **{k:v for k,v in self.valid_user_data.items() if k != 'email'}
            )

        # Test restricted domain
        with self.assertRaises(ValidationError):
            User.objects.create_user(
                email="test@competitor.com",
                **{k:v for k,v in self.valid_user_data.items() if k != 'email'}
            )

        # Test email normalization
        user = User.objects.create_user(
            email="Test.User@COMPANY.COM",
            **{k:v for k,v in self.valid_user_data.items() if k != 'email'}
        )
        self.assertEqual(user.email, "test.user@company.com")

    def test_create_user_role_validation(self):
        """Test role validation and restrictions."""
        # Test invalid role
        with self.assertRaises(ValidationError):
            User.objects.create_user(
                role="invalid_role",
                **{k:v for k,v in self.valid_user_data.items() if k != 'role'}
            )

        # Test buyer role creation
        buyer = User.objects.create_buyer(
            **{k:v for k,v in self.valid_user_data.items() if k != 'role'}
        )
        self.assertEqual(buyer.role, USER_ROLES['BUYER'])
        self.assertFalse(buyer.is_staff)
        self.assertTrue(buyer.is_buyer())

        # Test staff role creation
        staff = User.objects.create_staff(
            **{k:v for k,v in self.valid_user_data.items() if k != 'role'}
        )
        self.assertEqual(staff.role, USER_ROLES['ARENA_STAFF'])
        self.assertTrue(staff.is_staff)
        self.assertTrue(staff.is_arena_staff())

    def test_data_classification_security(self):
        """Test data classification security controls."""
        # Test default classification for new users
        user = UserFactory()
        self.assertEqual(
            user.data_classification,
            DataClassification.HIGHLY_SENSITIVE.value
        )

        # Test classification change validation
        with self.assertRaises(ValidationError):
            user.data_classification = DataClassification.PUBLIC.value
            user.save()

        # Test buyer classification requirements
        buyer = BuyerFactory()
        self.assertIn(
            buyer.data_classification,
            [DataClassification.HIGHLY_SENSITIVE.value, DataClassification.SENSITIVE.value]
        )

        # Test staff classification requirements
        staff = ArenaStaffFactory()
        self.assertEqual(
            staff.data_classification,
            DataClassification.HIGHLY_SENSITIVE.value
        )

    def test_password_security(self):
        """Test password security controls."""
        # Test password hashing
        user = User.objects.create_user(
            password="SecurePass123!",
            **self.valid_user_data
        )
        self.assertNotEqual(user.password, "SecurePass123!")
        self.assertTrue(user.check_password("SecurePass123!"))

        # Test unusable password for OAuth users
        oauth_user = User.objects.create_user(
            **self.valid_user_data
        )
        self.assertFalse(oauth_user.has_usable_password())

    def test_user_permissions(self):
        """Test user permission controls."""
        # Test buyer permissions
        buyer = BuyerFactory()
        self.assertFalse(buyer.is_staff)
        self.assertFalse(buyer.is_superuser)
        self.assertTrue(buyer.is_buyer())
        self.assertFalse(buyer.is_arena_staff())

        # Test staff permissions
        staff = ArenaStaffFactory()
        self.assertTrue(staff.is_staff)
        self.assertFalse(staff.is_superuser)
        self.assertFalse(staff.is_buyer())
        self.assertTrue(staff.is_arena_staff())

    def test_user_model_methods(self):
        """Test User model utility methods."""
        user = UserFactory(
            email="test@company.com",
            full_name="Test User",
            company="Test Corp"
        )

        # Test string representation
        self.assertEqual(
            str(user),
            f"test@company.com ({user.role})"
        )

        # Test name methods
        self.assertEqual(user.get_full_name(), "Test User")
        self.assertEqual(user.get_short_name(), "test@company.com")

        # Test clean method validation
        user.clean()  # Should not raise ValidationError
        
        user.data_classification = DataClassification.PUBLIC.value
        with self.assertRaises(ValidationError):
            user.clean()

    def test_user_factory_generation(self):
        """Test user factory data generation."""
        # Test basic factory
        user = UserFactory()
        self.assertIsNotNone(user.email)
        self.assertIsNotNone(user.full_name)
        self.assertIsNotNone(user.company)
        self.assertTrue(user.is_active)

        # Test buyer factory
        buyer = BuyerFactory()
        self.assertEqual(buyer.role, USER_ROLES['BUYER'])
        self.assertFalse(buyer.is_staff)

        # Test staff factory
        staff = ArenaStaffFactory()
        self.assertEqual(staff.role, USER_ROLES['ARENA_STAFF'])
        self.assertTrue(staff.is_staff)