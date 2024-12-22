"""
URL routing configuration for vendor-related API endpoints in the Arena MVP platform.

This module implements:
- Secure, versioned API endpoints for vendor management
- Rate limiting and caching controls
- Security headers and monitoring
- Health check endpoint

Version: 1.0.0
"""

from django.urls import path, include  # version 4.2+
from rest_framework.routers import DefaultRouter  # version 3.14+
from django.views.decorators.cache import cache_page  # version 4.2+
from rest_framework.throttling import RateLimitMiddleware  # version 3.14+
from django.middleware.security import SecurityHeadersMiddleware  # version 4.2+

from api.v1.vendors.views import VendorViewSet
from core.constants import CACHE_TIMEOUTS

# Initialize router with trailing slash for consistency
router = DefaultRouter(trailing_slash=True)

# Register vendor viewset with enhanced security
router.register(
    r'vendors',
    VendorViewSet,
    basename='vendor'
)

# Define URL patterns with security middleware and caching
urlpatterns = [
    # Include router URLs with rate limiting and security headers
    path('', 
        SecurityHeadersMiddleware(
            RateLimitMiddleware(
                include(router.urls)
            )
        )
    ),

    # Vendor list endpoint with caching
    path('vendors/', 
        cache_page(CACHE_TIMEOUTS['VENDOR_LIST'])(
            VendorViewSet.as_view({'get': 'list'})
        ),
        name='vendor-list'
    ),

    # Individual vendor endpoints
    path('vendors/<uuid:pk>/',
        VendorViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update'
        }),
        name='vendor-detail'
    ),

    # Vendor matching endpoint
    path('vendors/matches/',
        VendorViewSet.as_view({'post': 'get_matches'}),
        name='vendor-matches'
    ),

    # Vendor activation/deactivation endpoints
    path('vendors/<uuid:pk>/activate/',
        VendorViewSet.as_view({'post': 'activate'}),
        name='vendor-activate'
    ),
    path('vendors/<uuid:pk>/deactivate/',
        VendorViewSet.as_view({'post': 'deactivate'}),
        name='vendor-deactivate'
    ),

    # Health check endpoint
    path('vendors/health/',
        VendorViewSet.as_view({'get': 'health_check'}),
        name='vendor-health'
    ),
]

# Export URL patterns for inclusion in main URL configuration
app_name = 'vendors'