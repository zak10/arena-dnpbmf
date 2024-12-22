"""
Service layer implementation for managing software evaluation requests with enhanced security,
monitoring and error handling capabilities.

This module implements:
- Secure request creation and management
- AI-powered requirement parsing
- Vendor matching
- Enhanced monitoring and metrics
- Data retention policies

Version: 1.0.0
"""

import logging
import time
from typing import Dict, List, Optional, Any
from uuid import UUID

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.cache import cache

from requests.models import Request
from requests.tasks import parse_request_requirements, match_request_vendors
from integrations.anthropic.client import AnthropicClient
from core.constants import DataClassification, PERFORMANCE_THRESHOLDS
from core.utils.validators import validate_text_input, DataValidator
from core.exceptions import RequestError, SystemError

# Configure structured logging
logger = logging.getLogger(__name__)

# Constants
REQUEST_EXPIRY_DAYS = 365  # 1 year retention for active requests
MAX_PROCESSING_TIME = PERFORMANCE_THRESHOLDS['AI_PROCESSING_TIME_MS'] / 1000  # Convert to seconds
CACHE_TIMEOUT = 3600  # 1 hour cache timeout
MAX_RETRIES = 3  # Maximum retry attempts for async operations

class RequestService:
    """
    Service class for managing software evaluation request lifecycle with enhanced 
    security and monitoring capabilities.
    """

    def __init__(self) -> None:
        """Initialize request service with dependencies and monitoring."""
        self._model = Request
        self._ai_client = AnthropicClient()
        self._validator = DataValidator(
            classification_level=DataClassification.SENSITIVE,
            custom_rules={
                'requirements': self._validate_requirements
            }
        )
        self._logger = logger.bind(service='request')

    @transaction.atomic
    def create_request(
        self, 
        raw_requirements: str,
        user_id: UUID,
        documents: Optional[List[Dict[str, Any]]] = None
    ) -> Request:
        """
        Create a new software evaluation request with validation and monitoring.

        Args:
            raw_requirements: Original requirements text
            user_id: ID of user creating request
            documents: Optional list of supporting documents

        Returns:
            Created request instance

        Raises:
            RequestError: If validation fails
            SystemError: If creation fails
        """
        start_time = time.time()
        metrics = {
            'operation': 'create_request',
            'user_id': str(user_id)
        }

        try:
            # Validate input
            self._validate_input(raw_requirements, documents)

            # Create request instance
            request = self._model.objects.create(
                user_id=user_id,
                raw_requirements=raw_requirements,
                data_classification=DataClassification.SENSITIVE.value,
                expires_at=timezone.now() + timezone.timedelta(days=REQUEST_EXPIRY_DAYS)
            )

            # Attach documents if provided
            if documents:
                self._attach_documents(request, documents)

            # Cache request data
            self._cache_request(request)

            # Calculate processing time
            processing_time = time.time() - start_time
            metrics.update({
                'request_id': str(request.id),
                'processing_time': processing_time,
                'status': 'success'
            })

            # Log success
            self._logger.info(
                "Request created successfully",
                **metrics
            )

            # Trigger async requirement parsing
            self._trigger_parsing(request.id)

            return request

        except ValidationError as e:
            metrics.update({
                'status': 'validation_error',
                'error': str(e)
            })
            self._logger.warning("Request validation failed", **metrics)
            raise RequestError(str(e))

        except Exception as e:
            metrics.update({
                'status': 'system_error',
                'error': str(e)
            })
            self._logger.error("Request creation failed", **metrics)
            raise SystemError("Failed to create request")

    def get_request(self, request_id: UUID) -> Request:
        """
        Retrieve request details with caching and security checks.

        Args:
            request_id: UUID of request to retrieve

        Returns:
            Request instance

        Raises:
            RequestError: If request not found
        """
        # Check cache first
        cache_key = f"request:{request_id}"
        cached_request = cache.get(cache_key)
        if cached_request:
            return cached_request

        try:
            request = self._model.objects.get(id=request_id)
            cache.set(cache_key, request, CACHE_TIMEOUT)
            return request
        except self._model.DoesNotExist:
            raise RequestError(f"Request {request_id} not found")

    def _validate_input(self, raw_requirements: str, documents: Optional[List[Dict[str, Any]]]) -> None:
        """Validate request input data with security checks."""
        # Validate requirements text
        if not raw_requirements:
            raise ValidationError("Requirements text is required")

        validated_text = validate_text_input(
            raw_requirements,
            max_length=10000,
            required=True
        )

        # Validate documents if provided
        if documents:
            for doc in documents:
                if not doc.get('file') or not doc.get('type'):
                    raise ValidationError("Invalid document format")

    def _validate_requirements(self, requirements: str) -> bool:
        """Custom validation for requirements text."""
        # Minimum length check
        if len(requirements.strip()) < 50:
            return False
            
        # Maximum length check
        if len(requirements) > 10000:
            return False

        return True

    def _attach_documents(self, request: Request, documents: List[Dict[str, Any]]) -> None:
        """Attach supporting documents to request."""
        for doc in documents:
            request.documents.create(
                file=doc['file'],
                document_type=doc['type'],
                data_classification=DataClassification.SENSITIVE.value
            )

    def _cache_request(self, request: Request) -> None:
        """Cache request data with timeout."""
        cache_key = f"request:{request.id}"
        cache.set(cache_key, request, CACHE_TIMEOUT)

    def _trigger_parsing(self, request_id: UUID) -> None:
        """Trigger async requirement parsing with retry policy."""
        try:
            parse_request_requirements.delay(request_id)
        except Exception as e:
            self._logger.error(
                "Failed to trigger requirement parsing",
                request_id=str(request_id),
                error=str(e)
            )
            # Retry with exponential backoff
            for attempt in range(MAX_RETRIES):
                try:
                    parse_request_requirements.apply_async(
                        args=[request_id],
                        countdown=2 ** attempt
                    )
                    break
                except Exception:
                    continue

    def update_request_status(self, request_id: UUID, status: str) -> Request:
        """
        Update request status with validation and monitoring.

        Args:
            request_id: UUID of request to update
            status: New status value

        Returns:
            Updated request instance

        Raises:
            RequestError: If status update fails
        """
        try:
            with transaction.atomic():
                request = self.get_request(request_id)
                request.status = status
                request.save()

                # Update cache
                self._cache_request(request)

                self._logger.info(
                    "Request status updated",
                    request_id=str(request_id),
                    status=status
                )

                return request

        except Exception as e:
            self._logger.error(
                "Failed to update request status",
                request_id=str(request_id),
                status=status,
                error=str(e)
            )
            raise RequestError(f"Failed to update request status: {str(e)}")