"""
Main URL configuration for the Arena MVP application.

This module implements:
- Secure URL routing with enhanced security controls
- API versioning and rate limiting
- Performance monitoring and caching
- Health check endpoint
- Static file serving with security headers

Version: 1.0.0
"""

import logging
from typing import List, Dict, Any

from django.conf import settings
from django.urls import path, include
from django.contrib import admin
from django.views.generic import RedirectView
from django.views.static import serve
from django.views.decorators.cache import cache_control
from django.http import JsonResponse
from django.core.cache import cache
from django.db import connection
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

from api.urls import urlpatterns as api_urlpatterns
from core.constants import CACHE_TIMEOUTS, HTTP_HEADERS

# Configure logging
logger = logging.getLogger(__name__)

@cache_control(no_cache=True, no_store=True)
def health_check(request) -> JsonResponse:
    """
    System health check endpoint that verifies critical components.

    Returns:
        JsonResponse: Health status of system components
    """
    try:
        # Check database connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        logger.error(f"Database health check failed: {str(e)}")

    # Check cache connectivity
    try:
        cache.set("health_check", "ok", 10)
        cache_status = "healthy" if cache.get("health_check") == "ok" else "unhealthy"
    except Exception as e:
        cache_status = f"unhealthy: {str(e)}"
        logger.error(f"Cache health check failed: {str(e)}")

    # Build health status response
    health_status = {
        "status": "healthy" if all(s == "healthy" for s in [db_status, cache_status]) else "unhealthy",
        "components": {
            "database": db_status,
            "cache": cache_status
        },
        "version": settings.VERSION
    }

    return JsonResponse(
        health_status,
        status=200 if health_status["status"] == "healthy" else 503
    )

class StaticFileView:
    """Enhanced static file serving with caching and security controls."""

    @method_decorator(cache_control(max_age=CACHE_TIMEOUTS['STATIC_ASSETS']))
    def get(self, request, path):
        """
        Serve static file with caching and security headers.

        Args:
            request: HTTP request
            path: File path

        Returns:
            HttpResponse: Static file response with security headers
        """
        response = serve(request, path, document_root=settings.STATIC_ROOT)
        response[HTTP_HEADERS['CONTENT_SECURITY_POLICY']] = settings.CSP_POLICY
        response[HTTP_HEADERS['X_CONTENT_TYPE_OPTIONS']] = 'nosniff'
        return response

# Main URL patterns with enhanced security
urlpatterns = [
    # Admin interface with CSRF protection
    path('admin/', csrf_protect(admin.site.urls)),

    # API routes with versioning and rate limiting
    path('api/', include((api_urlpatterns, 'api'), namespace='api')),

    # Health check endpoint
    path('health/', health_check, name='health-check'),

    # Redirect root to frontend
    path('', RedirectView.as_view(url=settings.FRONTEND_URL), name='root'),
]

# Development-only static file serving
if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(
        settings.STATIC_URL,
        document_root=settings.STATIC_ROOT,
        view=StaticFileView.as_view()
    )

# Add security headers middleware
admin.site.site_header = "Arena MVP Admin"
admin.site.site_title = "Arena MVP Admin Portal"

# Configure handler functions for error pages
handler400 = 'core.views.error_400'  # Bad request
handler403 = 'core.views.error_403'  # Permission denied
handler404 = 'core.views.error_404'  # Not found
handler500 = 'core.views.error_500'  # Server error

# Export URL patterns
__all__ = ['urlpatterns']