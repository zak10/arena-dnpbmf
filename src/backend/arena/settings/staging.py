"""
Django settings for Arena MVP platform - Staging Environment.

This module extends the base settings with staging-specific configurations for:
- Security and monitoring
- Database and caching
- Storage and email
- Logging and error tracking

Version: 1.0.0
"""

from os import environ
from arena.settings.base import *  # Import all base settings

# Debug should be disabled in staging
DEBUG = False

# Host/domain names that Django site can serve
ALLOWED_HOSTS = [
    '.arena-staging.com',
    '.elb.amazonaws.com'  # Allow AWS load balancer health checks
]

# CSRF and CORS configuration
CSRF_TRUSTED_ORIGINS = ['https://*.arena-staging.com']
CORS_ALLOWED_ORIGINS = ['https://*.arena-staging.com']

# Force HTTPS
SECURE_SSL_REDIRECT = True

# Environment marker
STAGING_ENVIRONMENT = True

# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': environ.get('DB_NAME', 'arena_staging'),
        'USER': environ.get('DB_USER', 'arena_staging'),
        'PASSWORD': environ.get('DB_PASSWORD'),
        'HOST': environ.get('DB_HOST'),
        'PORT': environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'sslmode': 'require'  # Force SSL connection
        }
    }
}

# Cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': environ.get('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'PASSWORD': environ.get('REDIS_PASSWORD'),
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'RETRY_ON_TIMEOUT': True
        }
    }
}

# AWS S3 storage configuration
AWS_STORAGE_BUCKET_NAME = 'arena-staging-documents'
AWS_S3_CUSTOM_DOMAIN = 'arena-staging-documents.s3.amazonaws.com'
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400'  # 24 hour cache
}
AWS_S3_REGION_NAME = 'us-east-1'
AWS_DEFAULT_ACL = 'private'
AWS_QUERYSTRING_EXPIRE = 3600  # 1 hour
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Email configuration (AWS SES)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'email-smtp.us-east-1.amazonaws.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = environ.get('SES_USER')
EMAIL_HOST_PASSWORD = environ.get('SES_PASSWORD')
DEFAULT_FROM_EMAIL = 'staging@arena-staging.com'
SERVER_EMAIL = 'alerts@arena-staging.com'

# Celery configuration
CELERY_BROKER_URL = environ.get('REDIS_URL')
CELERY_RESULT_BACKEND = 'django-db'
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
            'level': 'INFO'
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': '/var/log/arena/staging.log',
            'formatter': 'verbose',
            'level': 'INFO'
        }
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO'
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False
        }
    }
}

# Security settings
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Anthropic API configuration
ANTHROPIC_API_BASE_URL = 'https://api.anthropic.com/v1'
ANTHROPIC_API_KEY = environ.get('ANTHROPIC_API_KEY')
API_VERSION = 'v1'
API_TIMEOUT = 30  # seconds

# Sentry error tracking
SENTRY_DSN = environ.get('SENTRY_DSN')
SENTRY_ENVIRONMENT = 'staging'
SENTRY_TRACES_SAMPLE_RATE = 1.0  # 100% tracing in staging
SENTRY_SEND_DEFAULT_PII = False
SENTRY_RELEASE = environ.get('GIT_SHA', 'staging')