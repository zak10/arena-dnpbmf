"""
Production environment settings for Arena MVP platform.

This module extends the base settings with production-specific configurations for:
- Security hardening and SSL/TLS settings
- Database connection pooling and encryption
- Redis caching with SSL
- AWS S3 storage with encryption
- Logging to CloudWatch
- Email via AWS SES
- Celery task queue configuration

Version: 1.0.0
"""

from os import environ
from arena.settings.base import *  # Import base settings
from core.constants import DataClassification

# Debug must be disabled in production
DEBUG = False

# Domain configuration
ALLOWED_HOSTS = environ.get('ALLOWED_HOSTS', '').split(',')
CSRF_TRUSTED_ORIGINS = environ.get('CSRF_TRUSTED_ORIGINS', '').split(',')

# Security configuration
SECRET_KEY = environ.get('DJANGO_SECRET_KEY')
DATA_CLASSIFICATION = DataClassification.HIGHLY_SENSITIVE

# Security settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 86400  # 24 hours

# Password hashing configuration
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]

# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': environ.get('DB_NAME'),
        'USER': environ.get('DB_USER'),
        'PASSWORD': environ.get('DB_PASSWORD'),
        'HOST': environ.get('DB_HOST'),
        'PORT': environ.get('DB_PORT', 5432),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'sslmode': 'verify-full',
            'sslcert': '/etc/ssl/certs/rds-ca-2019-root.pem'
        },
        'ATOMIC_REQUESTS': True,
        'CONN_HEALTH_CHECKS': True,
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
            'SSL': True,
            'CONNECTION_POOL_CLASS': 'redis.connection.BlockingConnectionPool',
            'CONNECTION_POOL_CLASS_KWARGS': {
                'max_connections': 50,
                'timeout': 20
            },
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'RETRY_ON_TIMEOUT': True,
            'MAX_CONNECTIONS': 1000,
            'HEALTH_CHECK_INTERVAL': 30
        },
        'KEY_PREFIX': 'arena_prod',
        'TIMEOUT': 300
    }
}

# AWS S3 storage configuration
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_ACCESS_KEY_ID = environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = environ.get('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = environ.get('AWS_REGION', 'us-east-1')
AWS_S3_CUSTOM_DOMAIN = environ.get('AWS_CLOUDFRONT_DOMAIN')
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400'
}
AWS_DEFAULT_ACL = 'private'
AWS_QUERYSTRING_AUTH = True
AWS_S3_ENCRYPTION = True
AWS_S3_FILE_OVERWRITE = False
AWS_S3_SIGNATURE_VERSION = 's3v4'
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
FILE_UPLOAD_PERMISSIONS = 0o644

# Email configuration (AWS SES)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'email-smtp.us-east-1.amazonaws.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = environ.get('AWS_SES_USER')
EMAIL_HOST_PASSWORD = environ.get('AWS_SES_PASSWORD')
DEFAULT_FROM_EMAIL = 'noreply@arena.io'
SERVER_EMAIL = 'alerts@arena.io'

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
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
        'file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/arena/error.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose'
        },
        'watchtower': {
            'level': 'INFO',
            'class': 'watchtower.CloudWatchLogHandler',
            'log_group': 'arena-production',
            'stream_name': 'application-logs',
            'formatter': 'verbose'
        }
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file', 'watchtower'],
            'level': 'INFO',
            'propagate': True
        },
        'django.request': {
            'handlers': ['file', 'watchtower'],
            'level': 'ERROR',
            'propagate': False
        }
    }
}

# Celery configuration
CELERY_BROKER_URL = environ.get('REDIS_URL')
CELERY_RESULT_BACKEND = 'django-db'
CELERY_BROKER_USE_SSL = True
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 240  # 4 minutes
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_QUEUES = {
    'high': {'priority': 10},
    'default': {'priority': 5},
    'low': {'priority': 1}
}

# Monitoring configuration
PROMETHEUS_EXPORT_MIGRATIONS = False
PROMETHEUS_METRICS_EXPORT_PORT = 9100
PROMETHEUS_METRICS_EXPORT_ADDRESS = ''

# Health check configuration
HEALTH_CHECK = {
    'DISK_USAGE_MAX': 90,  # Percentage
    'MEMORY_MIN': 100,  # MB
    'CERTIFICATE_EXPIRATION_WARNING_DAYS': 30
}

# Health check endpoint
HEALTH_CHECK_ENDPOINT = '/health/'