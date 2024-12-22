"""
Unit tests for Proposal and ProposalDocument models in the Arena MVP platform.

Tests cover:
- Data security and classification
- Retention policies and lifecycle
- Document handling and validation
- Status transitions and validation

Version: 1.0.0
"""

from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
import uuid

from proposals.models import (
    Proposal, 
    ProposalDocument,
    DRAFT,
    SUBMITTED,
    ACCEPTED,
    REJECTED,
    DOCUMENT_TYPES,
    MAX_FILE_SIZE
)
from core.constants import DataClassification
from requests.models import Request
from vendors.models import Vendor
from users.models import User

class TestProposal(TransactionTestCase):
    """Test cases for Proposal model functionality including security and lifecycle."""

    def setUp(self):
        """Set up test data before each test."""
        # Create test user (buyer)
        self.buyer = User.objects.create_buyer(
            email="test@buyer.com",
            full_name="Test Buyer",
            company="Test Company"
        )

        # Create test vendor
        self.vendor = Vendor.objects.create(
            name="Test Vendor",
            website="https://testvendor.com",
            status="active",
            description="Test vendor description"
        )

        # Create test request
        self.request = Request.objects.create(
            user=self.buyer,
            raw_requirements="Test requirements",
            status="submitted"
        )

        # Create test proposal
        self.proposal = Proposal.objects.create(
            request=self.request,
            vendor=self.vendor,
            status=DRAFT,
            pricing_details={"base_price": 1000},
            vendor_pitch="Test pitch",
            feature_matrix={"requirements": ["test"]}
        )

    def test_data_classification_validation(self):
        """Test data classification rules and validation."""
        # Verify default classification is SENSITIVE
        self.assertEqual(
            self.proposal.data_classification,
            DataClassification.SENSITIVE.value
        )

        # Test setting invalid classification
        with self.assertRaises(ValidationError):
            self.proposal.data_classification = DataClassification.PUBLIC.value
            self.proposal.save()

        # Test classification inheritance for documents
        doc = ProposalDocument.objects.create(
            proposal=self.proposal,
            title="Test Doc",
            document_type="TECHNICAL",
            file_path="test/path.pdf",
            file_size=1000
        )
        self.assertEqual(
            doc.data_classification,
            DataClassification.SENSITIVE.value
        )

    def test_proposal_retention_period(self):
        """Test proposal retention policy implementation."""
        # Test default retention period (2 years)
        expected_expiry = timezone.now() + timedelta(days=730)
        self.assertAlmostEqual(
            self.proposal.expires_at.timestamp(),
            expected_expiry.timestamp(),
            delta=60  # Allow 1 minute difference
        )

        # Test retention after status change
        self.proposal.status = ACCEPTED
        self.proposal.save()
        
        new_expiry = timezone.now() + timedelta(days=730)
        self.assertAlmostEqual(
            self.proposal.expires_at.timestamp(),
            new_expiry.timestamp(),
            delta=60
        )

        # Verify cascade deletion of documents
        doc = ProposalDocument.objects.create(
            proposal=self.proposal,
            title="Test Doc",
            document_type="TECHNICAL",
            file_path="test/path.pdf",
            file_size=1000
        )
        
        self.proposal.delete()
        with self.assertRaises(ProposalDocument.DoesNotExist):
            doc.refresh_from_db()

    def test_proposal_lifecycle_transitions(self):
        """Test proposal lifecycle with security validation."""
        # Test draft creation
        self.assertEqual(self.proposal.status, DRAFT)

        # Test submission validation
        with self.assertRaises(ValidationError):
            # Missing implementation_time_weeks
            self.proposal.submit()

        self.proposal.implementation_time_weeks = 4
        self.assertTrue(self.proposal.submit())
        self.assertEqual(self.proposal.status, SUBMITTED)

        # Test invalid status transition
        with self.assertRaises(ValidationError):
            self.proposal.status = DRAFT
            self.proposal.save()

        # Test acceptance
        self.proposal.status = ACCEPTED
        self.proposal.save()
        self.assertEqual(self.proposal.status, ACCEPTED)

        # Test rejection
        another_proposal = Proposal.objects.create(
            request=self.request,
            vendor=self.vendor,
            status=SUBMITTED,
            pricing_details={"base_price": 2000},
            vendor_pitch="Another pitch",
            feature_matrix={"requirements": ["test"]},
            implementation_time_weeks=6
        )
        another_proposal.status = REJECTED
        another_proposal.save()
        self.assertEqual(another_proposal.status, REJECTED)

class TestProposalDocument(TestCase):
    """Test cases for ProposalDocument model with focus on security."""

    def setUp(self):
        """Set up test data for document tests."""
        # Create test proposal first
        self.buyer = User.objects.create_buyer(
            email="test@buyer.com",
            full_name="Test Buyer",
            company="Test Company"
        )
        self.vendor = Vendor.objects.create(
            name="Test Vendor",
            website="https://testvendor.com",
            status="active",
            description="Test vendor description"
        )
        self.request = Request.objects.create(
            user=self.buyer,
            raw_requirements="Test requirements",
            status="submitted"
        )
        self.proposal = Proposal.objects.create(
            request=self.request,
            vendor=self.vendor,
            status=DRAFT,
            pricing_details={"base_price": 1000},
            vendor_pitch="Test pitch",
            feature_matrix={"requirements": ["test"]}
        )

    def test_document_security_controls(self):
        """Test document security implementation."""
        # Test file size validation
        with self.assertRaises(ValidationError):
            ProposalDocument.objects.create(
                proposal=self.proposal,
                title="Large Doc",
                document_type="TECHNICAL",
                file_path="test/large.pdf",
                file_size=MAX_FILE_SIZE + 1
            )

        # Test document type validation
        with self.assertRaises(ValidationError):
            ProposalDocument.objects.create(
                proposal=self.proposal,
                title="Invalid Type",
                document_type="INVALID",
                file_path="test/doc.pdf",
                file_size=1000
            )

        # Test path sanitization
        doc = ProposalDocument.objects.create(
            proposal=self.proposal,
            title="Test Doc",
            document_type="TECHNICAL",
            file_path="../test/path.pdf",
            file_size=1000
        )
        self.assertEqual(doc.file_path, "test/path.pdf")

        # Test data classification inheritance
        self.assertEqual(
            doc.data_classification,
            DataClassification.SENSITIVE.value
        )

    def test_document_retention_sync(self):
        """Test document retention alignment with proposal."""
        doc = ProposalDocument.objects.create(
            proposal=self.proposal,
            title="Test Doc",
            document_type="TECHNICAL",
            file_path="test/path.pdf",
            file_size=1000
        )

        # Verify document is deleted when proposal is deleted
        proposal_id = self.proposal.id
        self.proposal.delete()

        # Check document was deleted
        with self.assertRaises(ProposalDocument.DoesNotExist):
            ProposalDocument.objects.get(proposal_id=proposal_id)

        # Test document creation with invalid proposal
        with self.assertRaises(ValidationError):
            ProposalDocument.objects.create(
                proposal_id=uuid.uuid4(),  # Non-existent proposal
                title="Invalid Doc",
                document_type="TECHNICAL",
                file_path="test/invalid.pdf",
                file_size=1000
            )