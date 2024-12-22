"""
Celery tasks for secure, performant asynchronous processing of software evaluation requests.

This module implements:
- AI-powered requirement parsing with performance monitoring
- Secure vendor matching with validation
- Comprehensive error handling and retry mechanisms
- Detailed metrics tracking

Version: 1.0.0
"""

import time
from typing import Dict, Any, Optional
from uuid import UUID

import structlog  # version 23.1.0
import sentry_sdk  # version 1.29.2
from celery import shared_task
from django.db import transaction
from django.core.exceptions import ValidationError

from requests.models import Request
from integrations.anthropic.client import AnthropicClient, AnthropicError
from vendors.services import VendorService
from core.constants import PERFORMANCE_THRESHOLDS

# Configure structured logging
logger = structlog.get_logger(__name__)

# Performance thresholds
PARSING_TIMEOUT = PERFORMANCE_THRESHOLDS['AI_PROCESSING_TIME_MS'] / 1000  # Convert to seconds
CRITICAL_PARSING_TIMEOUT = PERFORMANCE_THRESHOLDS['CRITICAL_AI_PROCESSING_TIME_MS'] / 1000

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAYS = [1, 3, 5]  # Progressive retry delays in seconds
RETRY_BACKOFF = True

@shared_task(
    bind=True,
    max_retries=MAX_RETRIES,
    time_limit=CRITICAL_PARSING_TIMEOUT,
    retry_backoff=RETRY_BACKOFF,
    retry_delays=RETRY_DELAYS
)
def parse_requirements(self, request_id: UUID) -> Dict[str, Any]:
    """
    Secure Celery task for AI-powered requirement parsing with comprehensive monitoring.

    Args:
        request_id: UUID of the request to process

    Returns:
        Dict containing success status and performance metrics

    Raises:
        AnthropicError: If AI processing fails
        ValidationError: If request validation fails
    """
    start_time = time.time()
    metrics = {
        'request_id': str(request_id),
        'operation': 'parse_requirements',
        'status': 'started'
    }

    try:
        # Retrieve and validate request
        with transaction.atomic():
            request = Request.objects.select_for_update().get(id=request_id)
            if not request.raw_requirements:
                raise ValidationError("No requirements to parse")

        # Initialize AI client with security context
        anthropic_client = AnthropicClient()

        # Parse requirements with timeout monitoring
        parsing_result = anthropic_client.parse_requirements({
            'raw_text': request.raw_requirements,
            'documents': []  # Future: Add support for document parsing
        })

        # Calculate processing time
        processing_time = time.time() - start_time
        metrics.update({
            'processing_time': processing_time,
            'confidence_score': parsing_result['confidence_score'],
            'requirements_count': len(parsing_result['requirements'])
        })

        # Validate processing time
        if processing_time > PARSING_TIMEOUT:
            logger.warning(
                "Requirement parsing exceeded threshold",
                processing_time=processing_time,
                threshold=PARSING_TIMEOUT,
                **metrics
            )

        # Update request with parsed requirements
        with transaction.atomic():
            request.parsed_requirements = parsing_result['requirements']
            request.processing_metrics = metrics
            request.save()

        # Trigger vendor matching
        match_vendors.delay(request_id)

        # Log success metrics
        logger.info(
            "Requirements parsed successfully",
            **metrics
        )

        return {
            'success': True,
            'metrics': metrics
        }

    except AnthropicError as e:
        metrics.update({
            'status': 'failed',
            'error_type': 'anthropic_error',
            'error_message': str(e)
        })
        handle_parsing_error(request_id, e)
        # Retry with backoff
        raise self.retry(exc=e)

    except Exception as e:
        metrics.update({
            'status': 'failed',
            'error_type': type(e).__name__,
            'error_message': str(e)
        })
        handle_parsing_error(request_id, e)
        # Capture in Sentry
        sentry_sdk.capture_exception(e)
        raise

    finally:
        # Always log metrics
        logger.info("Requirement parsing metrics", **metrics)

@shared_task(
    bind=True,
    max_retries=MAX_RETRIES,
    retry_backoff=RETRY_BACKOFF
)
def match_vendors(self, request_id: UUID) -> Dict[str, Any]:
    """
    Secure Celery task for matching vendors to parsed requirements.

    Args:
        request_id: UUID of the request to match

    Returns:
        Dict containing success status and matching metrics

    Raises:
        ValidationError: If matching validation fails
    """
    start_time = time.time()
    metrics = {
        'request_id': str(request_id),
        'operation': 'match_vendors',
        'status': 'started'
    }

    try:
        # Retrieve and validate request
        with transaction.atomic():
            request = Request.objects.select_for_update().get(id=request_id)
            if not request.parsed_requirements:
                raise ValidationError("No parsed requirements available")

        # Initialize vendor service
        vendor_service = VendorService()

        # Get matching vendors
        matched_vendors = vendor_service.get_matches(request.parsed_requirements)

        # Calculate processing time
        processing_time = time.time() - start_time
        metrics.update({
            'processing_time': processing_time,
            'matched_vendors_count': len(matched_vendors)
        })

        # Update request with matches
        with transaction.atomic():
            request.matched_vendors.set(matched_vendors)
            request.processing_metrics.update(metrics)
            request.save()

        # Log success metrics
        logger.info(
            "Vendor matching completed successfully",
            **metrics
        )

        return {
            'success': True,
            'metrics': metrics
        }

    except Exception as e:
        metrics.update({
            'status': 'failed',
            'error_type': type(e).__name__,
            'error_message': str(e)
        })
        # Capture in Sentry
        sentry_sdk.capture_exception(e)
        
        # Log error metrics
        logger.error(
            "Vendor matching failed",
            **metrics
        )
        
        # Retry with backoff
        raise self.retry(exc=e)

    finally:
        # Always log metrics
        logger.info("Vendor matching metrics", **metrics)

def handle_parsing_error(request_id: UUID, error: Exception) -> None:
    """
    Handle requirement parsing errors with comprehensive logging and notifications.

    Args:
        request_id: UUID of the failed request
        error: Exception that occurred

    Returns:
        None
    """
    try:
        # Update request status
        with transaction.atomic():
            request = Request.objects.select_for_update().get(id=request_id)
            request.processing_metrics.update({
                'error_type': type(error).__name__,
                'error_message': str(error),
                'error_time': time.time()
            })
            request.save()

        # Log detailed error
        logger.error(
            "Requirement parsing failed",
            request_id=str(request_id),
            error_type=type(error).__name__,
            error_message=str(error)
        )

        # Capture in Sentry with context
        with sentry_sdk.push_scope() as scope:
            scope.set_tag('request_id', str(request_id))
            scope.set_extra('error_details', {
                'type': type(error).__name__,
                'message': str(error)
            })
            sentry_sdk.capture_exception(error)

    except Exception as e:
        # Log error handling failure
        logger.error(
            "Error handling failed",
            request_id=str(request_id),
            error_type=type(e).__name__,
            error_message=str(e)
        )