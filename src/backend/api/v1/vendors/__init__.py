"""
Initialization file for the vendors API module that exposes vendor management endpoints 
and services with enhanced security controls and anonymization capabilities.

This module implements:
- Secure vendor management endpoints
- Anonymous vendor evaluation
- Data classification controls
- Rate limiting protection
- Performance optimization

Version: 1.0.0
"""

# Third-party imports
from django_ratelimit import RateLimiter  # version 3.0.1

# Internal imports
from vendors.models import Vendor
from vendors.services import VendorService
from core.exceptions import ValidationError

# API version and endpoint configuration
API_VERSION = "v1"
VENDOR_API_PREFIX = "/api/v1/vendors"
VENDOR_RATE_LIMIT = "100/hour"
VENDOR_CACHE_TTL = 300  # 5 minutes

# Initialize rate limiter for vendor endpoints
vendor_rate_limiter = RateLimiter(
    key="ip",
    rate=VENDOR_RATE_LIMIT,
    block=True
)

# Initialize vendor service with enhanced security
vendor_service = VendorService()

# Export vendor model with security classification
__all__ = [
    'Vendor',
    'VendorService',
    'ValidationError',
    'API_VERSION',
    'VENDOR_API_PREFIX',
    'VENDOR_RATE_LIMIT',
    'VENDOR_CACHE_TTL',
    'vendor_rate_limiter',
    'vendor_service'
]

# Module metadata
__version__ = "1.0.0"
__author__ = "Arena MVP Team"
__description__ = "Vendor management API with enhanced security and anonymization"

def get_api_version():
    """Return the current API version."""
    return API_VERSION

def get_vendor_service():
    """
    Get initialized vendor service instance with security controls.
    
    Returns:
        VendorService: Configured vendor service instance
    """
    return vendor_service

def get_rate_limiter():
    """
    Get configured rate limiter for vendor endpoints.
    
    Returns:
        RateLimiter: Configured rate limiter instance
    """
    return vendor_rate_limiter