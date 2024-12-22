"""
Comprehensive test suite for ProposalService class validating business logic,
security controls, data handling, and workflow management.

Tests cover:
- Proposal creation and validation
- Document handling with security
- Status transitions and workflow
- Rate limiting and security controls
- Data classification and access control

Version: 1.0.0
"""

import pytest
from unittest.mock import Mock, patch
from django.core.exceptions import ValidationError
from django.utils import timezone
from freezegun import freeze_time

from proposals.services import ProposalService
from proposals.tests.factories import ProposalFactory, ProposalDocumentFactory
from core.constants import DataClassification, ProposalStatus
from core.exceptions import ProposalError, SystemError

# Test constants
MOCK_S3_URL = "https://test-bucket.s3.amazonaws.com/test-file.pdf"
TEST_FILE_CONTENT = b"Mock file content for testing"
SECURITY_CONTEXT = {"classification": "sensitive", "encryption": "AES-256"}
RATE_LIMIT_CONFIG = {"requests": 100, "period": 60}

@pytest.mark.django_db
class TestProposalService:
    """
    Test suite for ProposalService class validating business logic and security.
    """

    def setup_method(self):
        """Set up test environment with mocked dependencies."""
        # Initialize service with mocked dependencies
        self.service = ProposalService()
        
        # Mock S3 client
        self.s3_client_mock = Mock()
        self.s3_client_mock.upload_file.return_value = {
            's3_key': 'test-key.pdf',
            'version_id': 'v1',
            'encrypted': True
        }
        self.s3_client_mock.generate_presigned_url.return_value = MOCK_S3_URL
        self.service._s3_client = self.s3_client_mock
        
        # Mock email service
        self.email_service_mock = Mock()
        self.service._email_service = self.email_service_mock

    def test_create_proposal_with_security(self):
        """Test secure proposal creation with data classification."""
        # Create test data
        request = ProposalFactory.build().request
        vendor = ProposalFactory.build().vendor
        proposal_data = {
            'pricing_details': {
                'base_price': 500,
                'user_price': 50,
                'billing_period': 'monthly'
            },
            'vendor_pitch': 'Test pitch'
        }

        # Create proposal
        proposal = self.service.create_proposal(
            request_id=request.id,
            vendor_id=vendor.id,
            proposal_data=proposal_data
        )

        # Verify security controls
        assert proposal.data_classification == DataClassification.SENSITIVE.value
        assert proposal.status == ProposalStatus.DRAFT.value
        assert proposal.pricing_details['base_price'] == 500
        assert proposal.vendor_pitch == 'Test pitch'

    def test_create_proposal_validates_required_fields(self):
        """Test proposal creation validates required fields."""
        request = ProposalFactory.build().request
        vendor = ProposalFactory.build().vendor
        
        # Missing required fields
        with pytest.raises(ProposalError) as exc:
            self.service.create_proposal(
                request_id=request.id,
                vendor_id=vendor.id,
                proposal_data={}
            )
        assert exc.value.code == "E3003"
        assert "Missing required proposal fields" in str(exc.value)

    @freeze_time("2024-01-01 12:00:00")
    def test_submit_proposal_with_validation(self):
        """Test proposal submission with enhanced validation."""
        # Create draft proposal
        proposal = ProposalFactory(
            status=ProposalStatus.DRAFT.value,
            pricing_details={'base_price': 500},
            vendor_pitch='Test pitch'
        )

        # Submit proposal
        result = self.service.submit_proposal(proposal.id)

        # Verify submission
        assert result is True
        assert proposal.status == ProposalStatus.SUBMITTED.value
        
        # Verify email notification
        self.email_service_mock.send_proposal_received.assert_called_once()

    def test_submit_proposal_enforces_status_transition(self):
        """Test proposal submission enforces valid status transitions."""
        # Create already submitted proposal
        proposal = ProposalFactory(status=ProposalStatus.SUBMITTED.value)

        # Attempt to submit again
        with pytest.raises(ProposalError) as exc:
            self.service.submit_proposal(proposal.id)
        assert exc.value.code == "E3001"
        assert "Only draft proposals can be submitted" in str(exc.value)

    def test_document_upload_with_security(self):
        """Test secure document upload with encryption."""
        proposal = ProposalFactory()
        file_obj = Mock()
        file_obj.read.return_value = TEST_FILE_CONTENT
        file_obj.tell.return_value = len(TEST_FILE_CONTENT)

        # Upload document
        document = self.service.add_proposal_document(
            proposal_id=proposal.id,
            file_obj=file_obj,
            file_name='test.pdf',
            document_type='TECHNICAL'
        )

        # Verify security controls
        assert document.data_classification == DataClassification.SENSITIVE.value
        self.s3_client_mock.upload_file.assert_called_once()
        
        # Verify encryption
        upload_args = self.s3_client_mock.upload_file.call_args[1]
        assert upload_args['data_classification'] == DataClassification.SENSITIVE

    def test_document_upload_enforces_limits(self):
        """Test document upload enforces size and count limits."""
        proposal = ProposalFactory()
        
        # Create max number of existing documents
        ProposalDocumentFactory.create_batch(5, proposal=proposal)

        # Attempt to upload another document
        file_obj = Mock()
        with pytest.raises(ProposalError) as exc:
            self.service.add_proposal_document(
                proposal_id=proposal.id,
                file_obj=file_obj,
                file_name='test.pdf',
                document_type='TECHNICAL'
            )
        assert exc.value.code == "E3003"
        assert "Maximum document limit reached" in str(exc.value)

    def test_get_document_url_with_security(self):
        """Test secure document URL generation."""
        document = ProposalDocumentFactory()

        # Get document URL
        url = self.service.get_proposal_document_url(document.id)

        # Verify URL generation
        assert url == MOCK_S3_URL
        self.s3_client_mock.generate_presigned_url.assert_called_once_with(
            document.file_path,
            expires_in=24 * 3600
        )

    def test_get_document_url_validates_access(self):
        """Test document URL generation validates access."""
        # Attempt to get URL for non-existent document
        with pytest.raises(ProposalError) as exc:
            self.service.get_proposal_document_url('invalid-id')
        assert exc.value.code == "E3003"
        assert "Document not found" in str(exc.value)

    def test_rate_limiting(self):
        """Test rate limit enforcement."""
        proposal = ProposalFactory()

        # Simulate rapid requests
        for _ in range(RATE_LIMIT_CONFIG['requests'] + 1):
            with pytest.raises(SystemError) as exc:
                self.service.get_proposal_document_url(proposal.id)
            if exc.value:
                assert exc.value.code == "E4002"
                assert "Rate limit exceeded" in str(exc.value)
                break

    def test_proposal_caching(self):
        """Test proposal caching behavior."""
        proposal = ProposalFactory()

        # First request should hit database
        cached_proposal = self.service._get_cached_proposal(proposal.id)
        assert cached_proposal is None

        # Create proposal to trigger caching
        self.service.create_proposal(
            request_id=proposal.request.id,
            vendor_id=proposal.vendor.id,
            proposal_data={
                'pricing_details': proposal.pricing_details,
                'vendor_pitch': proposal.vendor_pitch
            }
        )

        # Second request should hit cache
        cached_proposal = self.service._get_cached_proposal(proposal.id)
        assert cached_proposal is not None
        assert cached_proposal.id == proposal.id

    @patch('proposals.services.transaction')
    def test_atomic_operations(self, mock_transaction):
        """Test atomic operations and rollback."""
        proposal = ProposalFactory()

        # Simulate transaction error
        mock_transaction.atomic.side_effect = Exception("Database error")

        # Attempt operation
        with pytest.raises(SystemError) as exc:
            self.service.submit_proposal(proposal.id)
        assert exc.value.code == "E4002"
        assert "Failed to submit proposal" in str(exc.value)

    def test_audit_logging(self, caplog):
        """Test comprehensive audit logging."""
        proposal = ProposalFactory()

        # Perform operations
        self.service.submit_proposal(proposal.id)

        # Verify audit logs
        assert any(
            record.levelname == "INFO" and
            f"Submitted proposal {proposal.id}" in record.message
            for record in caplog.records
        )