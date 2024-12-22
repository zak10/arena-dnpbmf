"""
Authentication module initialization for Arena MVP API v1.

This module configures and exports secure authentication components including:
- Magic link authentication with rate limiting
- Google OAuth with PKCE
- Redis-based session management
- Security monitoring and audit logging

Version: 1.0.0
"""

import logging
from datetime import timedelta
from typing import Dict, Any

from redis import Redis  # version: 4.0.0+
import jwt  # version: 2.0.0+
from django.conf import settings
from django.core.cache import cache

from api.v1.auth.views import (
    MagicLinkView,
    GoogleAuthView,
    LogoutView
)
from core.exceptions import SystemError
from core.constants import DataClassification

# Configure logging
logger = logging.getLogger(__name__)

# Module configuration
default_app_config = 'api.v1.auth.apps.AuthConfig'

# Authentication settings
AUTH_TOKEN_EXPIRY = timedelta(minutes=15)  # Magic link expiry
SESSION_EXPIRY = timedelta(hours=24)  # Session duration
RATE_LIMIT_ATTEMPTS = 3  # Max auth attempts per window
RATE_LIMIT_WINDOW = timedelta(hours=1)  # Rate limit window

def initialize_auth() -> bool:
    """
    Initialize authentication module with security controls and monitoring.

    Configures:
    - Redis session store
    - JWT signing keys
    - Rate limiting
    - Audit logging
    - Security monitoring

    Returns:
        bool: True if initialization successful

    Raises:
        SystemError: If critical initialization fails
    """
    try:
        # Initialize Redis connection for session store
        redis_client = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            ssl=True,
            decode_responses=True
        )

        # Verify Redis connection
        if not redis_client.ping():
            raise SystemError(
                message="Failed to connect to Redis session store",
                code="E4002"
            )

        # Configure session settings
        cache.configure({
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': settings.REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
                'RETRY_ON_TIMEOUT': True,
                'MAX_CONNECTIONS': 1000,
                'CONNECTION_POOL_CLASS': 'redis.BlockingConnectionPool',
                'CONNECTION_POOL_CLASS_KWARGS': {
                    'max_connections': 50,
                    'timeout': 20
                }
            }
        })

        # Verify JWT keys are configured
        if not (settings.JWT_PRIVATE_KEY and settings.JWT_PUBLIC_KEY):
            raise SystemError(
                message="Missing JWT signing keys",
                code="E4002"
            )

        # Configure rate limiting
        cache.add_prefix('rate_limit')
        cache.set_many({
            'max_attempts': RATE_LIMIT_ATTEMPTS,
            'window_seconds': int(RATE_LIMIT_WINDOW.total_seconds())
        })

        # Initialize audit logging
        logging.config.dictConfig({
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'auth_audit': {
                    'format': '[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] '
                             '[%(user)s] %(message)s',
                    'datefmt': '%Y-%m-%d %H:%M:%S'
                }
            },
            'handlers': {
                'auth_file': {
                    'level': 'INFO',
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': 'logs/auth_audit.log',
                    'maxBytes': 10485760,  # 10MB
                    'backupCount': 10,
                    'formatter': 'auth_audit'
                }
            },
            'loggers': {
                'api.v1.auth': {
                    'handlers': ['auth_file'],
                    'level': 'INFO',
                    'propagate': True
                }
            }
        })

        # Log successful initialization
        logger.info(
            "Authentication module initialized successfully",
            extra={
                'session_expiry': str(SESSION_EXPIRY),
                'rate_limit_window': str(RATE_LIMIT_WINDOW),
                'data_classification': DataClassification.HIGHLY_SENSITIVE.value
            }
        )

        return True

    except Exception as e:
        logger.error(
            f"Authentication module initialization failed: {str(e)}",
            extra={'error': str(e)}
        )
        raise SystemError(
            message="Failed to initialize authentication module",
            code="E4002",
            details={'error': str(e)}
        )

# Initialize module on import
initialize_auth()

# Export authentication views
__all__ = [
    'MagicLinkView',
    'GoogleAuthView', 
    'LogoutView',
    'AUTH_TOKEN_EXPIRY',
    'SESSION_EXPIRY',
    'RATE_LIMIT_ATTEMPTS',
    'RATE_LIMIT_WINDOW'
]