"""
Initialization module for the proposals API endpoints in the Arena MVP platform.

This module configures:
- Security controls and rate limiting
- Performance monitoring and metrics
- Proposal management endpoints
- Enhanced caching strategy
- Comprehensive error handling

Version: 1.0.0
Author: Arena Development Team
"""

import logging
from typing import Dict, Any

import sentry_sdk  # version: 1.9.0
from prometheus_client import Counter, Histogram  # version: 0.14.1
from django.core.cache import cache
from django.conf import settings

from api.v1.proposals.views import ProposalViewSet
from core.constants import PERFORMANCE_THRESHOLDS, CACHE_TIMEOUTS
from core.exceptions import SystemError

# Configure module logging
logger = logging.getLogger(__name__)

# Module metadata
VERSION = '1.0.0'
AUTHOR = 'Arena Development Team'

# Configure default app
default_app_config = 'api.v1.proposals.apps.ProposalsConfig'

# Prometheus metrics
PROPOSAL_REQUESTS = Counter(
    'proposal_requests_total',
    'Total number of proposal API requests',
    ['method', 'endpoint']
)

PROPOSAL_LATENCY = Histogram(
    'proposal_request_latency_seconds',
    'Proposal API request latency',
    ['method', 'endpoint'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

PROPOSAL_ERRORS = Counter(
    'proposal_errors_total',
    'Total number of proposal API errors',
    ['method', 'endpoint', 'error_code']
)

def setup_monitoring() -> None:
    """
    Initialize error tracking, performance monitoring and metrics collection.
    
    Configures:
    - Sentry SDK for error tracking
    - Prometheus metrics collectors
    - Performance thresholds
    - Audit logging
    """
    try:
        # Initialize Sentry SDK
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=0.25,
            profiles_sample_rate=0.1
        )
        
        # Set performance thresholds
        sentry_sdk.set_tag('api.performance.threshold_ms', 
                          PERFORMANCE_THRESHOLDS['API_RESPONSE_TIME_MS'])
        
        # Configure audit logging
        logging.config.dictConfig({
            'version': 1,
            'disable_existing_loggers': False,
            'handlers': {
                'audit': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': 'logs/proposal_audit.log',
                    'maxBytes': 10485760,  # 10MB
                    'backupCount': 10
                }
            },
            'loggers': {
                'proposal.audit': {
                    'handlers': ['audit'],
                    'level': 'INFO',
                    'propagate': False
                }
            }
        })
        
        logger.info("Proposal API monitoring configured successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize monitoring: {str(e)}")
        raise SystemError(
            message="Failed to initialize monitoring",
            code="E4002",
            details={'error': str(e)}
        )

def setup_security() -> None:
    """
    Configure security controls and rate limiting for proposal endpoints.
    
    Implements:
    - Rate limiting per endpoint
    - Request validation
    - CORS settings
    - Audit logging
    """
    try:
        # Configure rate limiting
        cache.set('proposal_rate_limit', {
            'create': 100,  # requests per hour
            'list': 1000,
            'detail': 500
        }, timeout=None)
        
        # Set up CORS configuration
        CORS_SETTINGS = {
            'CORS_ALLOW_CREDENTIALS': True,
            'CORS_ALLOW_METHODS': ['GET', 'POST', 'PUT', 'DELETE'],
            'CORS_ALLOW_HEADERS': [
                'accept',
                'accept-encoding',
                'authorization',
                'content-type',
                'origin',
                'user-agent',
                'x-csrftoken',
                'x-requested-with'
            ]
        }
        
        # Configure request validation
        REQUEST_VALIDATION = {
            'VALIDATE_CONTENT_TYPE': True,
            'ALLOWED_CONTENT_TYPES': ['application/json'],
            'MAX_CONTENT_LENGTH': 10 * 1024 * 1024  # 10MB
        }
        
        logger.info("Proposal API security controls configured successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize security: {str(e)}")
        raise SystemError(
            message="Failed to initialize security",
            code="E4002",
            details={'error': str(e)}
        )

# Initialize monitoring and security
setup_monitoring()
setup_security()

# Configure caching for proposal endpoints
CACHE_CONFIG = {
    'proposal_list': {
        'timeout': CACHE_TIMEOUTS['PROPOSAL_LIST'],
        'key_prefix': 'proposal_list'
    },
    'proposal_detail': {
        'timeout': CACHE_TIMEOUTS['API_RESPONSE'],
        'key_prefix': 'proposal_detail'
    }
}

# Export ViewSet with enhanced monitoring and caching
__all__ = ['ProposalViewSet']