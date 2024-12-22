"""
Core middleware package initializer for the Arena platform.

This module exposes essential middleware components for request processing, logging,
timing and correlation in a specific order for optimal functionality:
1. CorrelationMiddleware - Adds correlation IDs for request tracing
2. LoggingMiddleware - Provides structured request/response logging
3. TimingMiddleware - Measures request processing time

Version: 1.0.0
"""

# Import middleware components in order of execution
from .correlation import CorrelationMiddleware  # v1.0
from .logging import LoggingMiddleware  # v1.0.0
from .timing import TimingMiddleware  # v1.0.0

# Define public exports in order of middleware execution
__all__ = [
    'CorrelationMiddleware',  # Must be first for request tracing
    'LoggingMiddleware',      # Requires correlation context
    'TimingMiddleware'        # Performance measurement
]

# Middleware execution order and purpose documentation
MIDDLEWARE_ORDER = [
    {
        'middleware': 'CorrelationMiddleware',
        'purpose': 'Adds unique correlation IDs to each request for distributed tracing',
        'requirements': ['Request Tracing'],
        'dependencies': []
    },
    {
        'middleware': 'LoggingMiddleware',
        'purpose': 'Provides structured request/response logging with correlation context',
        'requirements': ['Security Monitoring'],
        'dependencies': ['CorrelationMiddleware']
    },
    {
        'middleware': 'TimingMiddleware',
        'purpose': 'Tracks request processing time to ensure performance targets',
        'requirements': ['System Performance'],
        'dependencies': ['CorrelationMiddleware', 'LoggingMiddleware']
    }
]

# Usage documentation for Django settings.py
DJANGO_SETTINGS = """
# Add to MIDDLEWARE setting in this order:
MIDDLEWARE = [
    'core.middleware.CorrelationMiddleware',  # Enable request tracing
    'core.middleware.LoggingMiddleware',      # Enable security monitoring
    'core.middleware.TimingMiddleware',       # Enable performance tracking
    # ... other middleware
]
"""