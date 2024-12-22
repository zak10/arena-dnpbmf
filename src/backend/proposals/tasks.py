"""
Celery tasks for asynchronous proposal processing and document handling in the Arena MVP platform.

This module implements:
- Secure proposal submission processing
- Document upload handling with validation
- Proposal cleanup and maintenance
- Enhanced monitoring and error handling

Version: 1.0.0
"""

import logging
import time
from uuid import UUID
from typing import Dict, Optional, BinaryIO

from celery import shared_task
from django.db import transaction
from celery.exceptions import MaxRetriesExceededError
from prometheus_client import Counter, Histogram
import sentry_sdk

from proposals.services import ProposalService
from proposals.models import Proposal
from core.utils.validators import validate_file_upload
from core.exceptions import ProposalError, SystemError

# Configure logging
logger = logging.getLogger(__name__)

# Task retry configuration
RETRY_BACKOFF = 300  # 5 minutes
MAX_RETRIES = 3

# Monitoring metrics
TASK_METRICS = Counter(
    'proposal_tasks_total',
    'Total proposal tasks processed',
    ['task_type', 'status']
)

PROCESSING_TIME = Histogram(
    'proposal_processing_seconds',
    'Time spent processing proposals',
    buckets=[1, 2, 5, 10, 30, 60, 120]
)

@shared_task(
    bind=True,
    max_retries=MAX_RETRIES,
    default_retry_delay=RETRY_BACKOFF,
    queue='proposals'
)
@transaction.atomic
def process_proposal_submission(self, proposal_id: UUID) -> bool:
    """
    Process proposal submission with enhanced security and monitoring.

    Args:
        proposal_id: UUID of proposal to process

    Returns:
        bool: Success status

    Raises:
        ProposalError: If proposal processing fails
        SystemError: If system error occurs
    """
    start_time = time.time()
    task_type = 'proposal_submission'

    try:
        # Get proposal instance
        proposal = Proposal.objects.select_for_update().get(id=proposal_id)

        # Validate proposal state
        if proposal.status != 'draft':
            raise ProposalError(
                message="Only draft proposals can be processed",
                code="E3001"
            )

        # Initialize service
        proposal_service = ProposalService()

        # Submit proposal
        success = proposal_service.submit_proposal(proposal_id)

        # Update metrics
        processing_time = time.time() - start_time
        PROCESSING_TIME.observe(processing_time)
        TASK_METRICS.labels(
            task_type=task_type,
            status='success'
        ).inc()

        logger.info(
            f"Processed proposal submission {proposal_id}",
            extra={
                'proposal_id': str(proposal_id),
                'processing_time': processing_time,
                'status': 'success'
            }
        )

        return success

    except Proposal.DoesNotExist:
        TASK_METRICS.labels(task_type=task_type, status='error').inc()
        logger.error(f"Proposal {proposal_id} not found")
        raise ProposalError(
            message="Proposal not found",
            code="E3001"
        )

    except (ProposalError, SystemError) as e:
        TASK_METRICS.labels(task_type=task_type, status='error').inc()
        
        # Capture error context
        sentry_sdk.set_context("proposal", {
            "id": str(proposal_id),
            "error_code": e.code
        })
        
        # Retry if appropriate
        if self.request.retries < MAX_RETRIES:
            raise self.retry(exc=e)
            
        logger.error(
            f"Failed to process proposal {proposal_id}: {str(e)}",
            extra={'error_code': e.code}
        )
        raise

    except Exception as e:
        TASK_METRICS.labels(task_type=task_type, status='error').inc()
        logger.error(f"Unexpected error processing proposal {proposal_id}: {str(e)}")
        raise SystemError(
            message="Failed to process proposal",
            code="E4002",
            details={'error': str(e)}
        )

@shared_task(
    bind=True,
    max_retries=MAX_RETRIES,
    default_retry_delay=RETRY_BACKOFF,
    queue='documents'
)
@transaction.atomic
def process_document_upload(
    self,
    proposal_id: UUID,
    file_obj: BinaryIO,
    filename: str,
    content_type: str
) -> Dict:
    """
    Process proposal document upload with security validation.

    Args:
        proposal_id: Associated proposal ID
        file_obj: Document file object
        filename: Original filename
        content_type: File content type

    Returns:
        Dict: Upload result with status and document ID

    Raises:
        ProposalError: If document upload fails
        SystemError: If system error occurs
    """
    start_time = time.time()
    task_type = 'document_upload'

    try:
        # Validate file
        validate_file_upload(file_obj)

        # Initialize service
        proposal_service = ProposalService()

        # Upload document
        document = proposal_service.add_proposal_document(
            proposal_id=proposal_id,
            file_obj=file_obj,
            file_name=filename,
            document_type='OTHER'
        )

        # Update metrics
        processing_time = time.time() - start_time
        PROCESSING_TIME.observe(processing_time)
        TASK_METRICS.labels(
            task_type=task_type,
            status='success'
        ).inc()

        logger.info(
            f"Processed document upload for proposal {proposal_id}",
            extra={
                'proposal_id': str(proposal_id),
                'document_id': str(document.id),
                'filename': filename,
                'processing_time': processing_time
            }
        )

        return {
            'status': 'success',
            'document_id': str(document.id),
            'filename': filename
        }

    except (ProposalError, SystemError) as e:
        TASK_METRICS.labels(task_type=task_type, status='error').inc()
        
        # Capture error context
        sentry_sdk.set_context("document_upload", {
            "proposal_id": str(proposal_id),
            "filename": filename,
            "error_code": e.code
        })
        
        # Retry if appropriate
        if self.request.retries < MAX_RETRIES:
            raise self.retry(exc=e)
            
        logger.error(
            f"Failed to process document upload: {str(e)}",
            extra={
                'proposal_id': str(proposal_id),
                'filename': filename,
                'error_code': e.code
            }
        )
        raise

    except Exception as e:
        TASK_METRICS.labels(task_type=task_type, status='error').inc()
        logger.error(f"Unexpected error processing document upload: {str(e)}")
        raise SystemError(
            message="Failed to process document upload",
            code="E4002",
            details={'error': str(e)}
        )

@shared_task(queue='maintenance')
@transaction.atomic
def cleanup_expired_proposals() -> Dict:
    """
    Periodic task to clean up expired proposals and documents.

    Returns:
        Dict: Cleanup statistics and metrics

    Raises:
        SystemError: If cleanup fails
    """
    start_time = time.time()
    task_type = 'proposal_cleanup'
    stats = {
        'proposals_deleted': 0,
        'documents_deleted': 0,
        'storage_reclaimed': 0
    }

    try:
        # Get expired proposals
        expired_proposals = Proposal.objects.filter(
            expires_at__lt=time.time(),
            status__in=['draft', 'rejected']
        ).select_related()

        # Process in batches
        batch_size = 100
        for i in range(0, expired_proposals.count(), batch_size):
            batch = expired_proposals[i:i + batch_size]
            
            for proposal in batch:
                # Track document storage
                for doc in proposal.documents.all():
                    stats['storage_reclaimed'] += doc.file_size
                    stats['documents_deleted'] += 1
                
                # Delete proposal
                proposal.delete()
                stats['proposals_deleted'] += 1

        # Update metrics
        processing_time = time.time() - start_time
        PROCESSING_TIME.observe(processing_time)
        TASK_METRICS.labels(
            task_type=task_type,
            status='success'
        ).inc()

        logger.info(
            "Completed proposal cleanup",
            extra={
                'stats': stats,
                'processing_time': processing_time
            }
        )

        return stats

    except Exception as e:
        TASK_METRICS.labels(task_type=task_type, status='error').inc()
        logger.error(f"Failed to cleanup expired proposals: {str(e)}")
        raise SystemError(
            message="Failed to cleanup expired proposals",
            code="E4002",
            details={'error': str(e)}
        )