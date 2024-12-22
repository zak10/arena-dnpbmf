"""
Unit tests for Request and Requirement models in the Arena MVP platform.

Tests cover:
- Request data validation and security
- Requirement parsing and vendor matching
- Data retention policies
- Security classification controls
- Status transitions and lifecycle

Version: 1.0.0
"""

from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from unittest.mock import Mock, patch
from freezegun import freeze_time  # v1.2+

from requests.models import Request, Requirement
from users.models import User
from core.constants import DataClassification, RequestStatus

class RequestModelTest(TestCase):
    """Test cases for Request model functionality including security, retention and vendor matching."""

    def setUp(self):
        """Set up test data and mocks before each test."""
        # Create test buyer user
        self.buyer = User.objects.create_buyer(
            email="test@company.com",
            full_name="Test Buyer",
            company="Test Company"
        )

        # Create base test request
        self.request = Request.objects.create(
            user=self.buyer,
            raw_requirements="Test software requirements",
            parsed_requirements={
                "type": "CRM",
                "features": ["contact management", "email integration"],
                "budget": "10000"
            },
            status=RequestStatus.DRAFT.value
        )

        # Set up vendor matcher mock
        self.vendor_matcher = Mock()
        self.vendor_matcher.match_score.return_value = 0.85

    def test_request_creation(self):
        """Test basic request creation with validation."""
        self.assertEqual(self.request.user, self.buyer)
        self.assertEqual(self.request.status, RequestStatus.DRAFT.value)
        self.assertEqual(self.request.data_classification, DataClassification.SENSITIVE.value)
        self.assertTrue(self.request.is_anonymized)
        self.assertIsNotNone(self.request.expires_at)

    def test_request_security_classification(self):
        """Test request security classification and validation."""
        # Verify default classification is SENSITIVE
        self.assertEqual(
            self.request.data_classification,
            DataClassification.SENSITIVE.value
        )

        # Test setting invalid classification
        with self.assertRaises(ValidationError):
            self.request.data_classification = DataClassification.PUBLIC.value
            self.request.save()

        # Test valid classification change
        self.request.data_classification = DataClassification.HIGHLY_SENSITIVE.value
        self.request.save()
        self.assertEqual(
            self.request.data_classification,
            DataClassification.HIGHLY_SENSITIVE.value
        )

    @freeze_time("2023-01-01")
    def test_request_retention_active(self):
        """Test retention period for active requests."""
        # Verify 1 year retention for active requests
        self.assertEqual(
            self.request.expires_at,
            timezone.now() + timedelta(days=365)
        )

    @freeze_time("2023-01-01")
    def test_request_retention_completed(self):
        """Test retention period changes when request is completed."""
        # Complete the request
        self.request.status = RequestStatus.COMPLETED.value
        self.request.save()

        # Verify 2 year retention for completed requests
        self.assertEqual(
            self.request.expires_at,
            timezone.now() + timedelta(days=730)
        )

    def test_request_anonymization(self):
        """Test buyer identity anonymization controls."""
        # Verify default anonymization
        self.assertTrue(self.request.is_anonymized)

        # Test revealing identity before completion
        with self.assertRaises(ValidationError):
            self.request.is_anonymized = False
            self.request.save()

        # Test valid identity reveal after completion
        self.request.status = RequestStatus.COMPLETED.value
        self.request.is_anonymized = False
        self.request.save()
        self.assertFalse(self.request.is_anonymized)

    @patch('requests.models.Vendor.objects')
    def test_vendor_matching(self, mock_vendor_objects):
        """Test vendor matching functionality."""
        # Set up vendor mock
        mock_vendor = Mock()
        mock_vendor.match_score.return_value = 0.85
        mock_vendor_objects.filter.return_value = [mock_vendor]

        # Test matching with valid requirements
        matched_vendors = self.request.match_vendors()
        self.assertEqual(len(matched_vendors), 1)
        self.assertEqual(self.request.status, RequestStatus.SUBMITTED.value)

        # Test matching without parsed requirements
        self.request.parsed_requirements = {}
        with self.assertRaises(ValidationError):
            self.request.match_vendors()

    def test_request_status_transitions(self):
        """Test request status transitions and validation."""
        # Test valid transition: DRAFT -> SUBMITTED
        self.request.status = RequestStatus.SUBMITTED.value
        self.request.save()
        self.assertEqual(self.request.status, RequestStatus.SUBMITTED.value)

        # Test valid transition: SUBMITTED -> IN_REVIEW
        self.request.status = RequestStatus.IN_REVIEW.value
        self.request.save()
        self.assertEqual(self.request.status, RequestStatus.IN_REVIEW.value)

        # Test invalid transition: IN_REVIEW -> DRAFT
        with self.assertRaises(ValidationError):
            self.request.status = RequestStatus.DRAFT.value
            self.request.save()

    def test_requirement_validation(self):
        """Test requirement creation and validation."""
        requirement = Requirement.objects.create(
            request=self.request,
            type="FUNCTIONAL",
            description="Must have email integration",
            is_mandatory=True
        )

        self.assertEqual(requirement.request, self.request)
        self.assertEqual(requirement.data_classification, DataClassification.SENSITIVE.value)

        # Test invalid requirement type
        with self.assertRaises(ValidationError):
            Requirement.objects.create(
                request=self.request,
                type="INVALID",
                description="Invalid requirement",
                is_mandatory=True
            )

    def test_request_proposal_tracking(self):
        """Test proposal count tracking and validation."""
        # Verify initial proposal count
        self.assertEqual(self.request.proposal_count, 0)

        # Mock proposal creation
        self.request.proposals.count = Mock(return_value=2)
        self.request.save()

        # Verify updated proposal count
        self.assertEqual(self.request.proposal_count, 2)

        # Verify minimum proposal validation
        self.assertLess(
            self.request.proposal_count,
            self.request.min_required_proposals
        )

def create_test_request(user, data, security_config=None):
    """
    Helper function to create test request instances with security controls.

    Args:
        user (User): Buyer user creating the request
        data (dict): Request data
        security_config (dict, optional): Security configuration overrides

    Returns:
        Request: Configured test request instance
    """
    security_config = security_config or {}
    
    request = Request.objects.create(
        user=user,
        raw_requirements=data.get('requirements', ''),
        parsed_requirements=data.get('parsed_requirements', {}),
        status=data.get('status', RequestStatus.DRAFT.value),
        data_classification=security_config.get(
            'classification',
            DataClassification.SENSITIVE.value
        ),
        is_anonymized=security_config.get('anonymized', True)
    )

    return request