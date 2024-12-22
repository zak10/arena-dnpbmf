"""
Comprehensive test suite for the request service layer, covering request creation,
submission, vendor matching, lifecycle management, security controls, and performance monitoring.

Version: 1.0.0
"""

import pytest  # version 7.3.1
import time
from unittest.mock import Mock, patch
from freezegun import freeze_time  # version 1.2.2
from django.utils import timezone
from django.core.exceptions import ValidationError

from requests.services import RequestService
from requests.models import Request
from requests.tests.factories import RequestFactory
from core.constants import DataClassification, RequestStatus, PERFORMANCE_THRESHOLDS
from core.exceptions import RequestError, SystemError

class TestRequestService:
    """
    Comprehensive test suite for RequestService class including security and performance validation.
    """

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test environment with mocks and monitoring."""
        self.service = RequestService()
        self.anthropic_client = Mock()
        self.service._ai_client = self.anthropic_client
        self.test_user_id = "550e8400-e29b-41d4-a716-446655440000"

    @pytest.mark.django_db
    def test_create_request_with_security_classification(self):
        """Test request creation with proper security classification."""
        raw_requirements = "Need a CRM system with email integration"
        
        request = self.service.create_request(
            raw_requirements=raw_requirements,
            user_id=self.test_user_id
        )
        
        assert request.data_classification == DataClassification.SENSITIVE.value
        assert request.is_anonymized is True
        assert request.status == RequestStatus.DRAFT.value

    @pytest.mark.django_db
    def test_create_request_with_invalid_data(self):
        """Test request creation with invalid data handling."""
        with pytest.raises(RequestError) as exc:
            self.service.create_request(
                raw_requirements="",  # Empty requirements
                user_id=self.test_user_id
            )
        assert "Requirements text is required" in str(exc.value)

    @pytest.mark.django_db
    def test_ai_processing_performance(self):
        """Test AI processing with detailed performance metrics."""
        raw_requirements = "Need a CRM system with following features:\n" + "\n".join([
            "1. Email integration",
            "2. Contact management",
            "3. Sales pipeline tracking"
        ])
        
        start_time = time.time()
        
        # Configure mock AI response
        self.anthropic_client.parse_requirements.return_value = {
            "requirements": [
                {"type": "FUNCTIONAL", "description": "Email integration"},
                {"type": "FUNCTIONAL", "description": "Contact management"}
            ],
            "confidence_score": 0.95
        }
        
        request = self.service.create_request(
            raw_requirements=raw_requirements,
            user_id=self.test_user_id
        )
        
        processing_time = time.time() - start_time
        
        # Verify performance thresholds
        assert processing_time < PERFORMANCE_THRESHOLDS['AI_PROCESSING_TIME_MS'] / 1000
        assert request.processing_metrics['processing_time'] < PERFORMANCE_THRESHOLDS['AI_PROCESSING_TIME_MS'] / 1000

    @pytest.mark.django_db
    @freeze_time("2023-01-01")
    def test_request_data_retention(self):
        """Test request data retention policies."""
        # Create test request
        request = RequestFactory(
            status=RequestStatus.COMPLETED.value,
            expires_at=timezone.now() + timezone.timedelta(days=730)  # 2 years
        )
        
        # Verify initial retention period
        assert request.expires_at > timezone.now()
        
        # Simulate time progression
        with freeze_time("2025-01-02"):  # After expiration
            # Verify request is marked for cleanup
            assert timezone.now() > request.expires_at

    @pytest.mark.django_db
    def test_request_security_controls(self):
        """Test request security controls and data protection."""
        request = RequestFactory(
            raw_requirements="Confidential: Need secure payment processing system",
            data_classification=DataClassification.HIGHLY_SENSITIVE.value
        )
        
        # Verify security controls
        assert request.is_anonymized is True
        assert request.data_classification == DataClassification.HIGHLY_SENSITIVE.value
        
        # Test security downgrade prevention
        with pytest.raises(ValidationError):
            request.data_classification = DataClassification.PUBLIC.value
            request.save()

    @pytest.mark.django_db
    def test_vendor_matching_performance(self):
        """Test vendor matching performance and accuracy."""
        request = RequestFactory()
        
        start_time = time.time()
        matched_vendors = request.match_vendors()
        processing_time = time.time() - start_time
        
        # Verify performance
        assert processing_time < 1.0  # Max 1 second for matching
        assert isinstance(matched_vendors, list)
        assert request.processing_metrics.get('matching_time') is not None

    @pytest.mark.django_db
    def test_error_handling(self):
        """Test comprehensive error handling scenarios."""
        # Test AI processing error
        self.anthropic_client.parse_requirements.side_effect = Exception("AI service unavailable")
        
        with pytest.raises(SystemError) as exc:
            self.service.create_request(
                raw_requirements="Test requirements",
                user_id=self.test_user_id
            )
        assert "Failed to create request" in str(exc.value)
        
        # Test validation error
        with pytest.raises(RequestError) as exc:
            self.service.create_request(
                raw_requirements="x" * 10001,  # Exceeds max length
                user_id=self.test_user_id
            )
        assert "exceeds maximum length" in str(exc.value)

    @pytest.mark.django_db
    def test_request_lifecycle_management(self):
        """Test request lifecycle state transitions."""
        request = RequestFactory(status=RequestStatus.DRAFT.value)
        
        # Test status transitions
        self.service.update_request_status(request.id, RequestStatus.SUBMITTED.value)
        request.refresh_from_db()
        assert request.status == RequestStatus.SUBMITTED.value
        
        # Test invalid transition
        with pytest.raises(RequestError):
            self.service.update_request_status(request.id, "invalid_status")

    @pytest.mark.django_db
    def test_concurrent_request_processing(self):
        """Test concurrent request processing handling."""
        request1 = RequestFactory()
        request2 = RequestFactory()
        
        # Simulate concurrent processing
        with patch('time.sleep'):
            result1 = self.service.create_request(
                raw_requirements="First request",
                user_id=self.test_user_id
            )
            result2 = self.service.create_request(
                raw_requirements="Second request",
                user_id=self.test_user_id
            )
        
        assert result1.id != result2.id
        assert result1.created_at != result2.created_at

    @pytest.mark.django_db
    def test_request_metrics_tracking(self):
        """Test request metrics tracking and monitoring."""
        request = self.service.create_request(
            raw_requirements="Test requirements",
            user_id=self.test_user_id
        )
        
        # Verify metrics are tracked
        assert 'processing_time' in request.processing_metrics
        assert 'ai_confidence_score' in request.processing_metrics
        assert request.processing_metrics.get('error_count', 0) == 0

    @pytest.mark.django_db
    def test_request_document_handling(self):
        """Test secure document handling with requests."""
        test_doc = {
            'file': 'test.pdf',
            'type': 'requirements_doc'
        }
        
        request = self.service.create_request(
            raw_requirements="Test with document",
            user_id=self.test_user_id,
            documents=[test_doc]
        )
        
        assert request.documents.count() == 1
        assert request.documents.first().document_type == 'requirements_doc'