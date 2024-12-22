"""
URL routing configuration for the proposals API endpoints in Arena MVP platform.

This module implements:
- Secure proposal management routes
- Enhanced caching configuration
- Rate limiting controls
- Monitoring and logging

Version: 1.0.0
"""

import logging
from django.urls import path, include
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie
from rest_framework.routers import DefaultRouter
from django.views.decorators.ratelimit import ratelimit

from api.v1.proposals.views import ProposalViewSet

# Configure logging
logger = logging.getLogger(__name__)

# Cache timeouts (in seconds)
CACHE_TIMEOUT = 60  # 1 minute for proposal lists
DETAIL_CACHE_TIMEOUT = 300  # 5 minutes for proposal details

# Rate limiting settings
RATE_LIMIT = '100/h'  # 100 requests per hour
CRITICAL_RATE_LIMIT = '10/m'  # 10 requests per minute for critical actions

# Initialize router with trailing slash configuration
router = DefaultRouter(trailing_slash=True)

def register_viewset():
    """
    Register ProposalViewSet with enhanced caching and security controls.
    """
    try:
        # Register base viewset routes
        router.register(
            r'proposals',
            ProposalViewSet,
            basename='proposals'
        )

        # Log successful registration
        logger.info(
            "Registered proposal API routes with security controls",
            extra={'viewset': 'ProposalViewSet'}
        )

    except Exception as e:
        logger.error(
            f"Failed to register proposal routes: {str(e)}",
            extra={'error': str(e)}
        )
        raise

# Register viewset
register_viewset()

# Define URL patterns with enhanced security and caching
urlpatterns = [
    # Default router URLs with caching
    path('', cache_page(CACHE_TIMEOUT)(vary_on_cookie(
        include((router.urls, 'proposals'))
    ))),

    # Custom action endpoints with rate limiting and security
    path(
        'proposals/<uuid:pk>/submit/',
        ratelimit(key='user', rate=CRITICAL_RATE_LIMIT)(
            ProposalViewSet.as_view({'post': 'submit'})
        ),
        name='submit-proposal'
    ),
    
    path(
        'proposals/<uuid:pk>/accept/',
        ratelimit(key='user', rate=CRITICAL_RATE_LIMIT)(
            ProposalViewSet.as_view({'post': 'accept'})
        ),
        name='accept-proposal'
    ),
    
    path(
        'proposals/<uuid:pk>/reject/',
        ratelimit(key='user', rate=CRITICAL_RATE_LIMIT)(
            ProposalViewSet.as_view({'post': 'reject'})
        ),
        name='reject-proposal'
    ),

    # Document management endpoints with size validation
    path(
        'proposals/<uuid:pk>/documents/upload/',
        ProposalViewSet.as_view({'post': 'upload_document'}),
        name='upload-document'
    ),
    
    path(
        'proposals/documents/<uuid:pk>/',
        cache_page(DETAIL_CACHE_TIMEOUT)(
            ProposalViewSet.as_view({'get': 'get_document'})
        ),
        name='get-document'
    ),
]

# App configuration
app_name = 'proposals'

# Export URL patterns
__all__ = ['urlpatterns']