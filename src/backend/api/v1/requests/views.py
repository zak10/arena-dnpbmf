"""
API views for handling software evaluation request operations in the Arena MVP platform.

Implements secure REST endpoints for request creation, management, and lifecycle operations
with enhanced security, performance optimization, and comprehensive validation.

Version: 1.0.0
"""

import logging
import time
from typing import Dict, Any

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from requests.services import RequestService
from api.v1.requests.serializers import RequestSerializer
from core.monitoring import monitoring
from core.constants import CACHE_TIMEOUTS, PERFORMANCE_THRESHOLDS

# Configure structured logging
logger = logging.getLogger(__name__)

# Cache settings
LIST_CACHE_TIMEOUT = CACHE_TIMEOUTS['DEFAULT']
DETAIL_CACHE_TIMEOUT = CACHE_TIMEOUTS['DEFAULT']

class IsBuyerPermission(permissions.BasePermission):
    """
    Custom permission to ensure only buyers can access request endpoints.
    Implements caching and audit logging for performance.
    """

    cache_timeout = 300  # 5 minutes

    def has_permission(self, request, view) -> bool:
        """
        Check if user has buyer permission with caching.

        Args:
            request: HTTP request
            view: API view

        Returns:
            bool: Permission granted status
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Check cache first
        cache_key = f"buyer_perm_{request.user.id}"
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return cached_result

        # Verify buyer role
        is_buyer = request.user.is_buyer()
        
        # Cache result
        cache.set(cache_key, is_buyer, self.cache_timeout)

        # Log permission check
        logger.info(
            "Buyer permission check",
            extra={
                'user_id': request.user.id,
                'is_buyer': is_buyer
            }
        )

        return is_buyer

class RequestViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for handling software evaluation request operations with 
    security, caching, and monitoring capabilities.
    """

    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyerPermission]
    service = RequestService()
    metrics = monitoring.get_metrics('request_api')

    def __init__(self, **kwargs):
        """Initialize request viewset with enhanced services."""
        super().__init__(**kwargs)
        self.service = RequestService()
        self.metrics = monitoring.get_metrics('request_api')

    @method_decorator(cache_page(LIST_CACHE_TIMEOUT))
    @monitoring.track_performance
    def list(self, request) -> Response:
        """
        List requests for authenticated buyer with caching.

        Args:
            request: HTTP request

        Returns:
            Response: List of requests
        """
        start_time = time.time()

        try:
            # Get requests for current user
            requests = self.service.list_requests(request.user.id)

            # Serialize data
            serializer = self.serializer_class(requests, many=True)

            # Calculate processing time
            processing_time = time.time() - start_time
            if processing_time > PERFORMANCE_THRESHOLDS['API_RESPONSE_TIME_MS'] / 1000:
                logger.warning(
                    "Request list operation exceeded threshold",
                    extra={
                        'processing_time': processing_time,
                        'threshold': PERFORMANCE_THRESHOLDS['API_RESPONSE_TIME_MS'] / 1000
                    }
                )

            # Log success
            logger.info(
                "Listed requests successfully",
                extra={
                    'user_id': request.user.id,
                    'count': len(requests),
                    'processing_time': processing_time
                }
            )

            return Response(serializer.data)

        except Exception as e:
            logger.error(
                "Failed to list requests",
                extra={
                    'user_id': request.user.id,
                    'error': str(e)
                }
            )
            return Response(
                {'error': 'Failed to retrieve requests'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @monitoring.track_performance
    @transaction.atomic
    def create(self, request) -> Response:
        """
        Create new software evaluation request with validation.

        Args:
            request: HTTP request

        Returns:
            Response: Created request data
        """
        start_time = time.time()

        try:
            # Validate request data
            serializer = self.serializer_class(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Create request
            created_request = self.service.create_request(
                user_id=request.user.id,
                **serializer.validated_data
            )

            # Calculate processing time
            processing_time = time.time() - start_time

            # Log success
            logger.info(
                "Created request successfully",
                extra={
                    'request_id': created_request.id,
                    'user_id': request.user.id,
                    'processing_time': processing_time
                }
            )

            return Response(
                self.serializer_class(created_request).data,
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            logger.error(
                "Failed to create request",
                extra={
                    'user_id': request.user.id,
                    'error': str(e)
                }
            )
            return Response(
                {'error': 'Failed to create request'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @method_decorator(cache_page(DETAIL_CACHE_TIMEOUT))
    @monitoring.track_performance
    def retrieve(self, request, pk=None) -> Response:
        """
        Get single request details with caching.

        Args:
            request: HTTP request
            pk: Request ID

        Returns:
            Response: Request details
        """
        try:
            # Get request with validation
            request_obj = self.service.get_request(pk, user_id=request.user.id)

            # Serialize and return
            serializer = self.serializer_class(request_obj)
            return Response(serializer.data)

        except Exception as e:
            logger.error(
                "Failed to retrieve request",
                extra={
                    'request_id': pk,
                    'user_id': request.user.id,
                    'error': str(e)
                }
            )
            return Response(
                {'error': 'Request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @monitoring.track_performance
    @transaction.atomic
    def update(self, request, pk=None) -> Response:
        """
        Update request details with validation.

        Args:
            request: HTTP request
            pk: Request ID

        Returns:
            Response: Updated request data
        """
        try:
            # Validate update data
            serializer = self.serializer_class(
                data=request.data,
                partial=True
            )
            serializer.is_valid(raise_exception=True)

            # Update request
            updated_request = self.service.update_request(
                request_id=pk,
                user_id=request.user.id,
                **serializer.validated_data
            )

            # Invalidate cache
            cache_key = f"request_detail_{pk}"
            cache.delete(cache_key)

            return Response(self.serializer_class(updated_request).data)

        except Exception as e:
            logger.error(
                "Failed to update request",
                extra={
                    'request_id': pk,
                    'user_id': request.user.id,
                    'error': str(e)
                }
            )
            return Response(
                {'error': 'Failed to update request'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(methods=['post'], detail=True)
    @monitoring.track_performance
    @transaction.atomic
    def submit(self, request, pk=None) -> Response:
        """
        Submit request for vendor matching with validation.

        Args:
            request: HTTP request
            pk: Request ID

        Returns:
            Response: Submission status
        """
        try:
            # Submit request
            submitted_request = self.service.submit_request(
                request_id=pk,
                user_id=request.user.id
            )

            # Invalidate cache
            cache_key = f"request_detail_{pk}"
            cache.delete(cache_key)

            return Response(self.serializer_class(submitted_request).data)

        except Exception as e:
            logger.error(
                "Failed to submit request",
                extra={
                    'request_id': pk,
                    'user_id': request.user.id,
                    'error': str(e)
                }
            )
            return Response(
                {'error': 'Failed to submit request'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(methods=['post'], detail=True)
    @monitoring.track_performance
    @transaction.atomic
    def cancel(self, request, pk=None) -> Response:
        """
        Cancel an active request with validation.

        Args:
            request: HTTP request
            pk: Request ID

        Returns:
            Response: Cancellation status
        """
        try:
            # Cancel request
            cancelled_request = self.service.cancel_request(
                request_id=pk,
                user_id=request.user.id
            )

            # Invalidate cache
            cache_key = f"request_detail_{pk}"
            cache.delete(cache_key)

            return Response(self.serializer_class(cancelled_request).data)

        except Exception as e:
            logger.error(
                "Failed to cancel request",
                extra={
                    'request_id': pk,
                    'user_id': request.user.id,
                    'error': str(e)
                }
            )
            return Response(
                {'error': 'Failed to cancel request'},
                status=status.HTTP_400_BAD_REQUEST
            )