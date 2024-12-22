"""
Django REST Framework views implementing the proposal management API endpoints for the Arena MVP platform.

This module provides:
- Secure proposal management endpoints
- Enhanced caching and performance optimization
- Comprehensive error handling
- Real-time status updates
- Audit logging

Version: 1.0.0
"""

import logging
from typing import Dict, Any

from django.db import transaction
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request

from proposals.models import Proposal
from proposals.services import ProposalService
from api.v1.proposals.serializers import ProposalSerializer, ProposalDocumentSerializer
from core.exceptions import ProposalError, SystemError
from core.constants import CACHE_TIMEOUTS, PERFORMANCE_THRESHOLDS

# Configure logging
logger = logging.getLogger(__name__)

class ProposalViewSet(viewsets.ModelViewSet):
    """
    ViewSet handling all proposal-related API endpoints with optimized performance and security.
    
    Implements:
    - CRUD operations for proposals
    - Document management
    - Status transitions
    - Caching strategy
    - Performance monitoring
    """

    serializer_class = ProposalSerializer
    _proposal_service = ProposalService()
    
    def __init__(self, *args, **kwargs):
        """Initialize viewset with caching and monitoring."""
        super().__init__(*args, **kwargs)
        self.cache_config = {
            'timeout': CACHE_TIMEOUTS['PROPOSAL_LIST'],
            'key_prefix': 'proposal_view'
        }
        self.performance_threshold = PERFORMANCE_THRESHOLDS['API_RESPONSE_TIME_MS']

    def get_queryset(self):
        """
        Get base queryset with security filtering.
        
        Returns:
            QuerySet: Filtered proposal queryset
        """
        queryset = Proposal.objects.select_related('vendor').prefetch_related('documents')
        
        # Filter based on user role
        user = self.request.user
        if user.is_buyer():
            return queryset.filter(request__user=user)
        elif user.is_arena_staff():
            return queryset.all()
        return queryset.none()

    @method_decorator(cache_page(CACHE_TIMEOUTS['API_RESPONSE']))
    @method_decorator(vary_on_cookie)
    def list(self, request: Request) -> Response:
        """
        List proposals with caching and pagination.
        
        Args:
            request: API request
            
        Returns:
            Response: List of proposals
        """
        try:
            queryset = self.get_queryset()
            page = self.paginate_queryset(queryset)
            serializer = self.serializer_class(page, many=True)
            
            return self.get_paginated_response(serializer.data)
            
        except Exception as e:
            logger.error(f"Failed to list proposals: {str(e)}")
            raise SystemError(
                message="Failed to retrieve proposals",
                code="E4002",
                details={'error': str(e)}
            )

    @transaction.atomic
    def create(self, request: Request) -> Response:
        """
        Create new proposal with validation and security checks.
        
        Args:
            request: API request with proposal data
            
        Returns:
            Response: Created proposal data
        """
        try:
            # Validate request data
            serializer = self.serializer_class(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Create proposal using service
            proposal = self._proposal_service.create_proposal(
                request_id=serializer.validated_data['request_id'],
                vendor_id=serializer.validated_data['vendor_id'],
                proposal_data=serializer.validated_data
            )
            
            # Invalidate relevant caches
            cache_key = f"proposal_list_{request.user.id}"
            cache.delete(cache_key)
            
            return Response(
                self.serializer_class(proposal).data,
                status=status.HTTP_201_CREATED
            )
            
        except ProposalError as e:
            logger.error(f"Proposal creation failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in proposal creation: {str(e)}")
            raise SystemError(
                message="Failed to create proposal",
                code="E4002",
                details={'error': str(e)}
            )

    @action(detail=True, methods=['POST'])
    @transaction.atomic
    def submit(self, request: Request, pk=None) -> Response:
        """
        Submit proposal for review with security validation.
        
        Args:
            request: API request
            pk: Proposal ID
            
        Returns:
            Response: Success status
        """
        try:
            # Submit proposal using service
            success = self._proposal_service.submit_proposal(proposal_id=pk)
            
            if success:
                # Invalidate caches
                cache_key = f"proposal_{pk}"
                cache.delete(cache_key)
                
                return Response({'status': 'submitted'})
            
            raise ProposalError(
                message="Failed to submit proposal",
                code="E3001"
            )
            
        except ProposalError as e:
            logger.error(f"Proposal submission failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in proposal submission: {str(e)}")
            raise SystemError(
                message="Failed to submit proposal",
                code="E4002",
                details={'error': str(e)}
            )

    @action(detail=True, methods=['POST'])
    def upload_document(self, request: Request, pk=None) -> Response:
        """
        Upload supporting document for proposal.
        
        Args:
            request: API request with document data
            pk: Proposal ID
            
        Returns:
            Response: Created document data
        """
        try:
            # Validate document data
            serializer = ProposalDocumentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Upload document using service
            document = self._proposal_service.add_proposal_document(
                proposal_id=pk,
                file_obj=request.FILES['file'],
                file_name=serializer.validated_data['title'],
                document_type=serializer.validated_data['file_type']
            )
            
            return Response(
                ProposalDocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )
            
        except ProposalError as e:
            logger.error(f"Document upload failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in document upload: {str(e)}")
            raise SystemError(
                message="Failed to upload document",
                code="E4002",
                details={'error': str(e)}
            )

    @action(detail=True, methods=['GET'])
    def get_document(self, request: Request, pk=None) -> Response:
        """
        Get secure document download URL.
        
        Args:
            request: API request
            pk: Document ID
            
        Returns:
            Response: Temporary document URL
        """
        try:
            url = self._proposal_service.get_proposal_document_url(
                document_id=pk
            )
            
            return Response({'url': url})
            
        except ProposalError as e:
            logger.error(f"Document URL generation failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting document URL: {str(e)}")
            raise SystemError(
                message="Failed to get document URL",
                code="E4002",
                details={'error': str(e)}
            )

    def perform_destroy(self, instance: Proposal) -> None:
        """
        Override destroy to implement soft deletion.
        
        Args:
            instance: Proposal to delete
        """
        instance.delete(deleted_by=self.request.user.email)
        
        # Invalidate caches
        cache_key = f"proposal_{instance.id}"
        cache.delete(cache_key)