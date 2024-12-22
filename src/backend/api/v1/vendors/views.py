"""
API views for managing vendor operations in the Arena MVP platform.

This module implements:
- Secure vendor management endpoints
- Performance optimization with caching
- Data classification controls
- Rate limiting and monitoring
- Audit logging

Version: 1.0.0
"""

import logging
from typing import Any, Dict, List

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from vendors.models import Vendor
from vendors.services import VendorService
from api.v1.vendors.serializers import VendorSerializer, VendorListSerializer
from core.decorators import rate_limit, monitor_performance
from core.logging import AuditLogger
from core.constants import (
    CACHE_TIMEOUTS,
    DataClassification,
    PERFORMANCE_THRESHOLDS
)
from core.exceptions import RequestError, SystemError

# Configure logging
logger = logging.getLogger(__name__)

class VendorViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for handling vendor-related API operations with security 
    and performance optimizations.

    Implements:
    - CRUD operations with security controls
    - Performance optimization via caching
    - Data classification handling
    - Rate limiting protection
    - Audit logging
    """

    queryset = Vendor.objects.select_related('profile').prefetch_related('capabilities')
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        """Initialize vendor viewset with enhanced security and monitoring."""
        super().__init__(*args, **kwargs)
        self._service = VendorService()
        self._audit_logger = AuditLogger()
        self._cache_timeout = CACHE_TIMEOUTS['VENDOR_LIST']

    def get_serializer_class(self):
        """Return appropriate serializer based on action and security context."""
        if self.action == 'list':
            return VendorListSerializer
        return VendorSerializer

    def get_serializer_context(self):
        """Enhance serializer context with security classification."""
        context = super().get_serializer_context()
        context['data_classification'] = DataClassification.SENSITIVE.value
        return context

    @method_decorator(cache_page(CACHE_TIMEOUTS['VENDOR_LIST']))
    @method_decorator(rate_limit(rate='100/min'))
    @monitor_performance
    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """
        List vendors with caching and performance optimization.

        Args:
            request: HTTP request object

        Returns:
            Response: List of vendors with security headers
        """
        try:
            # Check cache first
            cache_key = f"vendor_list:{request.user.id}"
            cached_response = cache.get(cache_key)
            if cached_response:
                return Response(cached_response)

            # Get queryset with optimizations
            queryset = self.filter_queryset(self.get_queryset())
            
            # Serialize with list serializer
            serializer = VendorListSerializer(queryset, many=True)
            response_data = serializer.data

            # Cache the response
            cache.set(cache_key, response_data, self._cache_timeout)

            # Log successful retrieval
            self._audit_logger.log_access(
                user=request.user,
                action="vendor_list",
                status="success"
            )

            return Response(response_data)

        except Exception as e:
            logger.error(f"Failed to list vendors: {str(e)}")
            raise SystemError("Failed to retrieve vendor list")

    @method_decorator(rate_limit(rate='100/min'))
    @monitor_performance
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """
        Create new vendor with enhanced security validation.

        Args:
            request: HTTP request object containing vendor data

        Returns:
            Response: Created vendor data with security headers

        Raises:
            RequestError: If validation fails
            SystemError: If creation fails
        """
        try:
            # Validate request data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Create vendor using service
            vendor = self._service.create_vendor(serializer.validated_data)

            # Log successful creation
            self._audit_logger.log_change(
                user=request.user,
                action="vendor_create",
                object_id=vendor.id,
                changes=serializer.validated_data
            )

            # Clear list cache
            cache.delete_pattern("vendor_list:*")

            return Response(
                self.get_serializer(vendor).data,
                status=201
            )

        except RequestError:
            raise
        except Exception as e:
            logger.error(f"Failed to create vendor: {str(e)}")
            raise SystemError("Failed to create vendor")

    @method_decorator(rate_limit(rate='100/min'))
    @monitor_performance
    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """
        Update vendor with security validation and audit logging.

        Args:
            request: HTTP request object with update data

        Returns:
            Response: Updated vendor data

        Raises:
            RequestError: If validation fails
            SystemError: If update fails
        """
        try:
            instance = self.get_object()
            
            # Validate update data
            serializer = self.get_serializer(
                instance,
                data=request.data,
                partial=kwargs.get('partial', False)
            )
            serializer.is_valid(raise_exception=True)

            # Perform update with service
            updated_vendor = self._service.update_vendor(
                instance.id,
                serializer.validated_data
            )

            # Log successful update
            self._audit_logger.log_change(
                user=request.user,
                action="vendor_update",
                object_id=instance.id,
                changes=serializer.validated_data
            )

            # Clear relevant caches
            cache.delete_pattern(f"vendor:{instance.id}:*")
            cache.delete_pattern("vendor_list:*")

            return Response(self.get_serializer(updated_vendor).data)

        except RequestError:
            raise
        except Exception as e:
            logger.error(f"Failed to update vendor: {str(e)}")
            raise SystemError("Failed to update vendor")

    @action(detail=False, methods=['POST'])
    @method_decorator(rate_limit(rate='100/min'))
    @monitor_performance
    def get_matches(self, request: Request) -> Response:
        """
        Get matching vendors based on requirements.

        Args:
            request: HTTP request object with matching criteria

        Returns:
            Response: List of matching vendors

        Raises:
            RequestError: If validation fails
            SystemError: If matching fails
        """
        try:
            # Get matches using service
            matches = self._service.get_matches(request.data)

            # Log successful match
            self._audit_logger.log_access(
                user=request.user,
                action="vendor_match",
                status="success",
                details={"match_count": len(matches)}
            )

            return Response(matches)

        except RequestError:
            raise
        except Exception as e:
            logger.error(f"Failed to get vendor matches: {str(e)}")
            raise SystemError("Failed to process vendor matching")