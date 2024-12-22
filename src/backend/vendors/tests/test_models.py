"""
Unit tests for the Vendor model class, validating vendor data management, 
status transitions, capabilities handling, data classification, and retention policies.

Version: 1.0.0
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone

from vendors.models import Vendor, PENDING, ACTIVE, INACTIVE, ARCHIVED
from vendors.tests.factories import VendorFactory
from core.constants import DataClassification

class TestVendorModel(TestCase):
    """
    Comprehensive test suite for Vendor model functionality including data management,
    status transitions, and security controls.
    """

    def setUp(self):
        """Set up test data before each test method execution."""
        self.vendor = VendorFactory.create()
        self.test_capabilities = {
            "technologies": ["Python", "React", "AWS"],
            "industries": ["Technology", "Finance"],
            "company_size": ["1-50", "51-200"],
            "features": ["API Integration", "Custom Reporting"],
            "pricing_tiers": [
                {
                    "name": "Enterprise",
                    "price": "$1000/month",
                    "features": ["All Features", "Premium Support", "SLA"]
                }
            ],
            "implementation_time": "2-4 weeks"
        }
        self.timestamp = timezone.now()

    def test_vendor_creation(self):
        """Validate vendor instance creation and field initialization."""
        vendor = Vendor.objects.create(
            name="Test Vendor",
            website="https://testvendor.com",
            description="Test Description",
            capabilities=self.test_capabilities
        )

        # Verify UUID generation and basic fields
        self.assertIsNotNone(vendor.id)
        self.assertEqual(vendor.name, "Test Vendor")
        self.assertEqual(vendor.website, "https://testvendor.com")
        
        # Verify default status and classification
        self.assertEqual(vendor.status, PENDING)
        self.assertEqual(vendor.data_classification, DataClassification.SENSITIVE.value)
        
        # Verify timestamps
        self.assertIsNotNone(vendor.created_at)
        self.assertIsNotNone(vendor.updated_at)
        self.assertIsNone(vendor.deleted_at)

    def test_vendor_validation(self):
        """Test vendor data validation rules."""
        # Test invalid name
        with self.assertRaises(ValidationError):
            vendor = VendorFactory.build(name="A")  # Too short
            vendor.save()

        # Test invalid website
        with self.assertRaises(ValidationError):
            vendor = VendorFactory.build(website="invalid-url")
            vendor.save()

        # Test invalid capabilities format
        with self.assertRaises(ValidationError):
            vendor = VendorFactory.build(capabilities="invalid")
            vendor.save()

    def test_vendor_status_transitions(self):
        """Test vendor status transition lifecycle and validation."""
        vendor = self.vendor

        # Test initial status
        self.assertEqual(vendor.status, PENDING)
        self.assertIsNone(vendor.last_verified_at)

        # Test activation
        vendor.activate()
        self.assertEqual(vendor.status, ACTIVE)
        self.assertIsNotNone(vendor.last_verified_at)
        self.assertIn('status_history', vendor.metadata)
        self.assertEqual(vendor.metadata['status_history'][-1]['to'], ACTIVE)

        # Test deactivation
        reason = "Contract ended"
        vendor.deactivate(reason)
        self.assertEqual(vendor.status, INACTIVE)
        self.assertEqual(vendor.metadata['deactivation_reason'], reason)
        self.assertIsNotNone(vendor.metadata['deactivated_at'])

        # Test archival
        vendor.archive()
        self.assertEqual(vendor.status, ARCHIVED)
        self.assertIsNotNone(vendor.metadata['archived_at'])
        self.assertIn('archive_snapshot', vendor.metadata)

    def test_vendor_capabilities_update(self):
        """Validate vendor capabilities management and schema validation."""
        vendor = self.vendor
        original_capabilities = vendor.capabilities.copy()

        # Test capabilities update
        vendor.update_capabilities(self.test_capabilities)
        self.assertEqual(vendor.capabilities, self.test_capabilities)
        self.assertIsNotNone(vendor.last_verified_at)
        
        # Verify capabilities history
        self.assertIn('capabilities_history', vendor.metadata)
        last_history = vendor.metadata['capabilities_history'][-1]
        self.assertEqual(last_history['previous'], original_capabilities)

        # Test invalid capabilities
        with self.assertRaises(ValidationError):
            vendor.update_capabilities("invalid")

    def test_vendor_soft_deletion(self):
        """Test vendor soft deletion and data retention."""
        vendor = self.vendor
        self.assertFalse(vendor.is_deleted)
        self.assertIsNone(vendor.deleted_at)

        # Perform soft deletion
        deleted_by = "test_user"
        vendor.delete(deleted_by=deleted_by)

        # Verify deletion state
        self.assertTrue(vendor.is_deleted)
        self.assertIsNotNone(vendor.deleted_at)
        self.assertEqual(vendor.deleted_by, deleted_by)

        # Verify data retention
        saved_vendor = Vendor.objects.get(id=vendor.id)
        self.assertTrue(saved_vendor.is_deleted)
        self.assertEqual(saved_vendor.name, vendor.name)
        self.assertEqual(saved_vendor.capabilities, vendor.capabilities)

        # Test restoration
        vendor.restore(restored_by="test_user")
        self.assertFalse(vendor.is_deleted)
        self.assertIsNone(vendor.deleted_at)
        self.assertIsNone(vendor.deleted_by)

    def test_vendor_data_classification(self):
        """Validate vendor data classification enforcement and immutability."""
        vendor = self.vendor

        # Verify default classification
        self.assertEqual(vendor.data_classification, DataClassification.SENSITIVE.value)

        # Test classification immutability
        with self.assertRaises(ValidationError):
            vendor.data_classification = DataClassification.PUBLIC.value
            vendor.save()

        # Verify classification cannot be removed
        with self.assertRaises(ValidationError):
            vendor.data_classification = None
            vendor.save()

        # Test classification validation
        with self.assertRaises(ValidationError):
            vendor.data_classification = "invalid"
            vendor.save()

    def test_vendor_metadata_tracking(self):
        """Test vendor metadata and history tracking."""
        vendor = self.vendor

        # Test status history tracking
        initial_status = vendor.status
        vendor.activate()
        status_history = vendor.metadata['status_history']
        self.assertGreater(len(status_history), 0)
        last_status = status_history[-1]
        self.assertEqual(last_status['from'], initial_status)
        self.assertEqual(last_status['to'], ACTIVE)

        # Test verification history
        self.assertIn('verification_history', vendor.metadata)
        self.assertIsNotNone(vendor.last_verified_at)

        # Test capabilities history
        original_capabilities = vendor.capabilities.copy()
        vendor.update_capabilities(self.test_capabilities)
        capabilities_history = vendor.metadata['capabilities_history']
        self.assertGreater(len(capabilities_history), 0)
        last_update = capabilities_history[-1]
        self.assertEqual(last_update['previous'], original_capabilities)