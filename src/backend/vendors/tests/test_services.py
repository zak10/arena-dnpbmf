"""
Comprehensive test suite for vendor service layer functionality.

Tests cover:
- Vendor creation and validation
- Security classification compliance
- Matching algorithm accuracy
- Performance characteristics
- Cache behavior
- Rate limiting

Version: 1.0.0
"""

import pytest
from datetime import datetime
from unittest.mock import patch, Mock
from faker import Faker
from freezegun import freeze_time  # version: 1.2+

from vendors.services import VendorService, MAX_VENDORS_PER_REQUEST
from vendors.tests.factories import VendorFactory
from core.exceptions import RequestError, SystemError
from core.constants import DataClassification, CACHE_TIMEOUTS

# Initialize test data generator
faker = Faker()
faker.seed_instance(12345)

# Test data constants
VALID_VENDOR_DATA = {
    'name': 'Test Vendor',
    'website': 'https://testvendor.com',
    'description': 'Test vendor description',
    'capabilities': {
        'product_type': 'CRM',
        'pricing_model': 'subscription',
        'implementation_time': '1-3 months',
        'security_certifications': ['SOC2', 'ISO27001'],
        'support_levels': ['email', 'phone', '24/7']
    },
    'security_classification': 'sensitive',
    'data_handling_level': 'level_2'
}

INVALID_VENDOR_DATA = {
    'name': '',
    'website': 'invalid-url',
    'capabilities': {},
    'security_classification': 'invalid_level'
}

@pytest.mark.django_db
class TestVendorService:
    """
    Test suite for VendorService functionality including security and performance.
    """

    def setup_method(self):
        """Set up test environment with service instance and dependencies."""
        self.service = VendorService()
        self.faker = Faker()
        self.cache_mock = Mock()
        self.service._cache_manager = self.cache_mock

    def test_create_vendor_success(self):
        """Test successful vendor creation with proper validation."""
        # Arrange
        vendor_data = VALID_VENDOR_DATA.copy()

        # Act
        vendor = self.service.create_vendor(vendor_data)

        # Assert
        assert vendor.name == vendor_data['name']
        assert vendor.website == vendor_data['website']
        assert vendor.capabilities['product_type'] == vendor_data['capabilities']['product_type']
        assert vendor.data_classification == DataClassification.SENSITIVE.value
        assert vendor.status == 'pending'

    def test_create_vendor_validation_error(self):
        """Test vendor creation with invalid data."""
        # Arrange
        vendor_data = INVALID_VENDOR_DATA.copy()

        # Act & Assert
        with pytest.raises(RequestError) as exc:
            self.service.create_vendor(vendor_data)
        assert exc.value.code == "E2002"
        assert "Missing required fields" in str(exc.value)

    def test_create_vendor_duplicate(self):
        """Test duplicate vendor creation prevention."""
        # Arrange
        vendor_data = VALID_VENDOR_DATA.copy()
        self.service.create_vendor(vendor_data)

        # Act & Assert
        with pytest.raises(RequestError) as exc:
            self.service.create_vendor(vendor_data)
        assert exc.value.code == "E2001"
        assert "already exists" in str(exc.value)

    @patch('vendors.services.cache')
    def test_get_matches_with_caching(self, mock_cache):
        """Test vendor matching with cache behavior."""
        # Arrange
        requirements = {
            'product_type': 'CRM',
            'implementation_time': '1-3 months',
            'security_certifications': ['SOC2']
        }
        vendors = VendorFactory.create_batch(5)
        cache_key = self.service._get_cache_key(requirements)
        mock_cache.get.return_value = None

        # Act
        matches = self.service.get_matches(requirements)

        # Assert
        assert len(matches) <= MAX_VENDORS_PER_REQUEST
        mock_cache.set.assert_called_once_with(
            cache_key,
            matches,
            timeout=CACHE_TIMEOUTS['VENDOR_LIST']
        )

    def test_vendor_matching_performance(self):
        """Test vendor matching performance with large dataset."""
        # Arrange
        large_vendor_set = VendorFactory.create_batch(100)
        requirements = {
            'product_type': 'CRM',
            'implementation_time': '1-3 months'
        }

        # Act
        with patch('vendors.services.cache') as mock_cache:
            mock_cache.get.return_value = None
            start_time = datetime.now()
            matches = self.service.get_matches(requirements)
            execution_time = (datetime.now() - start_time).total_seconds()

        # Assert
        assert execution_time < 1.0  # Should complete within 1 second
        assert len(matches) <= MAX_VENDORS_PER_REQUEST
        assert all('id' in vendor for vendor in matches)

    def test_security_classification_validation(self):
        """Test security classification validation rules."""
        # Arrange
        vendor_data = VALID_VENDOR_DATA.copy()
        vendor_data['security_classification'] = 'public'

        # Act & Assert
        with pytest.raises(RequestError) as exc:
            self.service.create_vendor(vendor_data)
        assert exc.value.code == "E2001"
        assert "security classification" in str(exc.value).lower()

    @freeze_time("2024-01-01 12:00:00")
    def test_vendor_data_retention(self):
        """Test vendor data retention and archival."""
        # Arrange
        vendor = self.service.create_vendor(VALID_VENDOR_DATA)
        
        # Act
        vendor.archive()

        # Assert
        assert vendor.status == 'archived'
        assert 'archive_snapshot' in vendor.metadata
        assert vendor.metadata['archived_at'] == "2024-01-01T12:00:00"

    def test_vendor_capabilities_update(self):
        """Test vendor capabilities update with validation."""
        # Arrange
        vendor = self.service.create_vendor(VALID_VENDOR_DATA)
        new_capabilities = {
            'product_type': 'ERP',
            'pricing_model': 'perpetual',
            'implementation_time': '3-6 months',
            'security_certifications': ['ISO27001'],
            'support_levels': ['email', 'phone']
        }

        # Act
        vendor.update_capabilities(new_capabilities)

        # Assert
        assert vendor.capabilities['product_type'] == 'ERP'
        assert len(vendor.metadata['capabilities_history']) == 1
        assert vendor.capabilities_version == '1.0'

    def test_vendor_search_filters(self):
        """Test vendor search with multiple filters."""
        # Arrange
        vendors = VendorFactory.create_batch(10)
        requirements = {
            'product_type': 'CRM',
            'implementation_time': '1-3 months',
            'security_certifications': ['SOC2'],
            'support_levels': ['24/7']
        }

        # Act
        matches = self.service.get_matches(requirements)

        # Assert
        assert isinstance(matches, list)
        for match in matches:
            assert 'id' in match
            assert 'capabilities' in match
            assert 'name' not in match  # Verify anonymization

    def test_rate_limit_enforcement(self):
        """Test rate limiting for vendor operations."""
        # Arrange
        vendor_data = VALID_VENDOR_DATA.copy()

        # Act & Assert
        for _ in range(100):  # Test rate limit threshold
            self.service.create_vendor(vendor_data)

        with pytest.raises(RequestError) as exc:
            self.service.create_vendor(vendor_data)
        assert exc.value.code == "E2001"
        assert "rate limit" in str(exc.value).lower()