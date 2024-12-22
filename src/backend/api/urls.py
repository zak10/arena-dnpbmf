"""
Main URL routing configuration for the Arena MVP API, implementing versioned REST endpoints 
with comprehensive security, monitoring, and error handling.

This module provides:
- Versioned API routing
- Security middleware integration
- Rate limiting controls
- Performance monitoring
- Error handling

Version: 1.0.0
"""

import logging
from typing import List, Dict, Any
from django.urls import path, include, re_path
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.middleware.security import SecurityMiddleware
from rest_framework.throttling import AnonRateThrottle

from api.v1.auth.urls import urlpatterns as auth_urls
from api.v1.vendors.urls import urlpatterns as vendors_urls
from api.v1.requests.urls import urlpatterns as requests_urls
from api.v1.proposals.urls import urlpatterns as proposals_urls
from core.constants import CACHE_TIMEOUTS, HTTP_HEADERS

# Configure logging
logger = logging.getLogger(__name__)

# API version configuration
API_VERSION = 'v1'

# Rate limiting configuration
RATE_LIMIT_CONF = {
    'DEFAULT': '100/min',  # Default rate limit
    'AUTH': '3/min',      # Authentication endpoints
    'REQUESTS': '50/min', # Request management
    'PROPOSALS': '30/min' # Proposal management
}

def validate_patterns(patterns: List) -> bool:
    """
    Validates URL patterns for security and consistency.

    Args:
        patterns: List of URL patterns to validate

    Returns:
        bool: True if patterns are valid, raises ValidationError otherwise

    Raises:
        ValidationError: If pattern validation fails
    """
    try:
        # Check for duplicate patterns
        pattern_paths = [p.pattern for p in patterns]
        if len(pattern_paths) != len(set(pattern_paths)):
            raise ValueError("Duplicate URL patterns detected")

        # Validate pattern naming conventions
        for pattern in patterns:
            if not pattern.name or not pattern.name.islower():
                raise ValueError(f"Invalid pattern name: {pattern.name}")

        # Verify security middleware presence
        if not any(isinstance(m, SecurityMiddleware) for m in patterns):
            raise ValueError("Security middleware not configured")

        # Validate rate limit configurations
        for pattern in patterns:
            if hasattr(pattern, 'throttle_classes'):
                if not any(issubclass(t, AnonRateThrottle) for t in pattern.throttle_classes):
                    raise ValueError(f"Missing rate limiting for pattern: {pattern.name}")

        logger.info("URL pattern validation successful")
        return True

    except Exception as e:
        logger.error(f"URL pattern validation failed: {str(e)}")
        raise

# Define versioned API URL patterns
urlpatterns = [
    # API version prefix
    path(f'api/{API_VERSION}/', include([
        # Authentication endpoints with rate limiting
        path('auth/', 
            SecurityMiddleware(
                AnonRateThrottle(rate=RATE_LIMIT_CONF['AUTH'])(
                    include((auth_urls, 'auth'))
                )
            )
        ),

        # Vendor management endpoints
        path('vendors/',
            SecurityMiddleware(
                AnonRateThrottle(rate=RATE_LIMIT_CONF['DEFAULT'])(
                    include((vendors_urls, 'vendors'))
                )
            )
        ),

        # Request management endpoints
        path('requests/',
            SecurityMiddleware(
                AnonRateThrottle(rate=RATE_LIMIT_CONF['REQUESTS'])(
                    include((requests_urls, 'requests'))
                )
            )
        ),

        # Proposal management endpoints
        path('proposals/',
            SecurityMiddleware(
                AnonRateThrottle(rate=RATE_LIMIT_CONF['PROPOSALS'])(
                    include((proposals_urls, 'proposals'))
                )
            )
        ),
    ])),

    # Health check endpoint
    path('health/', 
        cache_page(CACHE_TIMEOUTS['DEFAULT'])(
            lambda request: {'status': 'healthy'}
        ),
        name='health-check'
    ),

    # Catch-all for invalid paths
    re_path(r'^.*$', 
        lambda request: {'error': 'Invalid API endpoint'},
        name='invalid-endpoint'
    ),
]

# Validate URL patterns
validate_patterns(urlpatterns)

# Set app name for reverse URL lookups
app_name = 'api'

# Export URL patterns
__all__ = ['urlpatterns']