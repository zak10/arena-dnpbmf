"""
WSGI configuration for Arena MVP platform.

This module provides the WSGI application interface for production deployment with Gunicorn.
Includes environment validation, error logging, and health check configuration.

Version: 1.0.0
"""

# Python 3.11+
import os
import logging
from django.core.wsgi import get_wsgi_application  # Django 4.2+

# Configure logging
logger = logging.getLogger('arena.wsgi')

def validate_production_environment():
    """
    Validates that all required production environment variables and settings are properly configured.
    
    Returns:
        bool: True if environment is valid, raises RuntimeError otherwise
    """
    required_vars = [
        'DJANGO_SECRET_KEY',
        'ALLOWED_HOSTS',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'DB_HOST',
        'REDIS_URL',
        'REDIS_PASSWORD',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_STORAGE_BUCKET_NAME',
        'AWS_SES_USER',
        'AWS_SES_PASSWORD'
    ]

    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    logger.info("Production environment validation successful")
    return True

def initialize_wsgi_application():
    """
    Initializes and configures the WSGI application with production settings.
    
    Returns:
        WSGIHandler: Configured WSGI application instance
    """
    try:
        # Set Django settings module for production
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'arena.settings.production')
        
        # Validate production environment
        validate_production_environment()
        
        # Initialize WSGI application
        application = get_wsgi_application()
        
        # Log successful initialization
        logger.info("WSGI application initialized successfully")
        
        return application
        
    except Exception as e:
        logger.critical(f"Failed to initialize WSGI application: {str(e)}")
        raise

# Initialize the production WSGI application
application = initialize_wsgi_application()

"""
Gunicorn configuration for the WSGI application:

worker_class = 'sync'
workers = 2-8 (based on CPU cores)
threads = 1
timeout = 30
max_requests = 1000
max_requests_jitter = 50
keepalive = 5
worker_connections = 1000
graceful_timeout = 30

Error log format: %(asctime)s [%(process)d] [%(levelname)s] %(message)s
Access log format: %(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"
"""