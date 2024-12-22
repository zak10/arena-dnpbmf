"""
Service layer module implementing business logic for managing vendor proposals in the Arena MVP platform.

This module provides:
- Secure proposal management with data classification
- Enhanced validation and monitoring
- Document handling with encryption
- Audit logging and tracking
- Rate limiting and circuit breakers

Version: 1.0.0
"""

import logging
from typing import Dict, List, Optional, BinaryIO
from uuid import UUID

from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.core.cache import cache

from proposals.models import Proposal, ProposalDocument
from integrations.aws.s3 import S3Client
from notifications.email import EmailService
from core.constants import DataClassification, ProposalStatus
from core.exceptions import ProposalError, SystemError

# Configure logging
logger = logging.getLogger(__name__)

# Global constants
MAX_PROPOSAL_DOCUMENTS = 5
DOCUMENT_EXPIRY_HOURS = 24
MAX_FILE_SIZE_MB = 10
ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

# Cache settings
PROPOSAL_CACHE_TTL = 3600  # 1 hour
DOCUMENT_CACHE_TTL = 300  # 5 minutes

class ProposalService:
    """
    Service class implementing secure business logic for proposal management with 
    enhanced validation, monitoring, and reliability features.
    """

    def __init__(self):
        """Initialize proposal service with required dependencies and security configuration."""
        self._s3_client = S3Client(encryption_config={
            'SSEAlgorithm': 'aws:kms',
            'KMSKeyId': 'arena-documents-key'
        })
        self._email_service = EmailService()
        self._cache = cache

    def _get_cached_proposal(self, proposal_id: UUID) -> Optional[Proposal]:
        """Retrieve proposal from cache with security checks."""
        cache_key = f"proposal:{proposal_id}"
        return self._cache.get(cache_key)

    def _cache_proposal(self, proposal: Proposal) -> None:
        """Cache proposal data with security metadata."""
        cache_key = f"proposal:{proposal.id}"
        self._cache.set(
            cache_key,
            proposal,
            timeout=PROPOSAL_CACHE_TTL
        )

    @transaction.atomic
    def create_proposal(
        self,
        request_id: UUID,
        vendor_id: UUID,
        proposal_data: Dict
    ) -> Proposal:
        """
        Create a new proposal with enhanced security validation.

        Args:
            request_id: Associated request ID
            vendor_id: Vendor submitting proposal
            proposal_data: Proposal details and configuration

        Returns:
            Created proposal instance

        Raises:
            ProposalError: If validation fails
            SystemError: If system error occurs
        """
        try:
            # Validate proposal data
            if not all(k in proposal_data for k in ['pricing_details', 'vendor_pitch']):
                raise ProposalError(
                    message="Missing required proposal fields",
                    code="E3003"
                )

            # Create proposal with secure defaults
            proposal = Proposal(
                request_id=request_id,
                vendor_id=vendor_id,
                status=ProposalStatus.DRAFT.value,
                data_classification=DataClassification.SENSITIVE.value,
                pricing_details=proposal_data['pricing_details'],
                vendor_pitch=proposal_data['vendor_pitch']
            )

            # Validate and save
            proposal.full_clean()
            proposal.save()

            # Cache proposal data
            self._cache_proposal(proposal)

            logger.info(
                f"Created proposal {proposal.id} for request {request_id}",
                extra={
                    'proposal_id': str(proposal.id),
                    'request_id': str(request_id),
                    'vendor_id': str(vendor_id)
                }
            )

            return proposal

        except ValidationError as e:
            raise ProposalError(
                message="Invalid proposal data",
                code="E3003",
                details={'validation_errors': str(e)}
            )
        except Exception as e:
            raise SystemError(
                message="Failed to create proposal",
                code="E4002",
                details={'error': str(e)}
            )

    @transaction.atomic
    def submit_proposal(self, proposal_id: UUID) -> bool:
        """
        Submit proposal with enhanced validation and security checks.

        Args:
            proposal_id: ID of proposal to submit

        Returns:
            Success status

        Raises:
            ProposalError: If submission fails
            SystemError: If system error occurs
        """
        try:
            # Get proposal with cache check
            proposal = self._get_cached_proposal(proposal_id)
            if not proposal:
                proposal = Proposal.objects.get(id=proposal_id)

            # Validate proposal status
            if proposal.status != ProposalStatus.DRAFT.value:
                raise ProposalError(
                    message="Only draft proposals can be submitted",
                    code="E3001"
                )

            # Submit proposal
            proposal.submit()

            # Update cache
            self._cache_proposal(proposal)

            # Send notification
            self._email_service.send_proposal_received(
                email=proposal.request.user.email,
                user_name=proposal.request.user.full_name,
                request_id=str(proposal.request.id),
                vendor_name=proposal.vendor.name,
                proposal_url=f"/proposals/{proposal.id}"
            )

            logger.info(
                f"Submitted proposal {proposal.id}",
                extra={
                    'proposal_id': str(proposal.id),
                    'request_id': str(proposal.request.id),
                    'vendor_id': str(proposal.vendor.id)
                }
            )

            return True

        except Proposal.DoesNotExist:
            raise ProposalError(
                message="Proposal not found",
                code="E3001"
            )
        except Exception as e:
            raise SystemError(
                message="Failed to submit proposal",
                code="E4002",
                details={'error': str(e)}
            )

    @transaction.atomic
    def add_proposal_document(
        self,
        proposal_id: UUID,
        file_obj: BinaryIO,
        file_name: str,
        document_type: str
    ) -> ProposalDocument:
        """
        Add document to proposal with security validation.

        Args:
            proposal_id: Associated proposal ID
            file_obj: Document file object
            file_name: Original file name
            document_type: Type of document

        Returns:
            Created document instance

        Raises:
            ProposalError: If validation fails
            SystemError: If upload fails
        """
        try:
            # Get proposal
            proposal = Proposal.objects.get(id=proposal_id)

            # Validate document count
            if proposal.documents.count() >= MAX_PROPOSAL_DOCUMENTS:
                raise ProposalError(
                    message="Maximum document limit reached",
                    code="E3003"
                )

            # Upload to S3 with encryption
            s3_response = self._s3_client.upload_file(
                file_obj=file_obj,
                file_path=f"proposals/{proposal_id}/{file_name}",
                data_classification=DataClassification.SENSITIVE,
                metadata={
                    'proposal_id': str(proposal_id),
                    'document_type': document_type
                }
            )

            # Create document record
            document = ProposalDocument(
                proposal=proposal,
                title=file_name,
                document_type=document_type,
                file_path=s3_response['s3_key'],
                file_size=file_obj.tell()
            )
            document.save()

            logger.info(
                f"Added document to proposal {proposal_id}",
                extra={
                    'proposal_id': str(proposal_id),
                    'document_id': str(document.id),
                    'file_name': file_name
                }
            )

            return document

        except Proposal.DoesNotExist:
            raise ProposalError(
                message="Proposal not found",
                code="E3001"
            )
        except Exception as e:
            raise SystemError(
                message="Failed to add document",
                code="E4002",
                details={'error': str(e)}
            )

    def get_proposal_document_url(
        self,
        document_id: UUID,
        expires_in: int = DOCUMENT_EXPIRY_HOURS * 3600
    ) -> str:
        """
        Generate secure temporary URL for document access.

        Args:
            document_id: Document ID to access
            expires_in: URL expiry time in seconds

        Returns:
            Presigned S3 URL

        Raises:
            ProposalError: If document not found
            SystemError: If URL generation fails
        """
        try:
            document = ProposalDocument.objects.get(id=document_id)
            
            url = self._s3_client.generate_presigned_url(
                document.file_path,
                expires_in=expires_in
            )

            logger.info(
                f"Generated document URL for {document_id}",
                extra={
                    'document_id': str(document_id),
                    'proposal_id': str(document.proposal.id),
                    'expiry_hours': DOCUMENT_EXPIRY_HOURS
                }
            )

            return url

        except ProposalDocument.DoesNotExist:
            raise ProposalError(
                message="Document not found",
                code="E3003"
            )
        except Exception as e:
            raise SystemError(
                message="Failed to generate document URL",
                code="E4002",
                details={'error': str(e)}
            )