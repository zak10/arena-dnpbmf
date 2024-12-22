"""
Django settings initialization module for Arena MVP platform.

This module dynamically loads the appropriate environment-specific settings based on
the DJANGO_ENV environment variable. It implements robust validation, error handling,
and logging for settings management across development, staging, and production environments.

Version: 1.0.0
"""

from os import environ  # Python 3.11+
from importlib import import_module  # Python 3.11+
import logging  # Python 3.11+

# Configure module logger
logger = logging.getLogger('arena.settings')

# Define valid deployment environments
VALID_ENVIRONMENTS = ['development', 'staging', 'production']

# Get current environment, defaulting to development
DJANGO_ENV = environ.get('DJANGO_ENV', 'development')

# Construct settings module path
SETTINGS_MODULE = f'arena.settings.{DJANGO_ENV}'

def validate_environment(env: str) -> bool:
    """
    Validates that DJANGO_ENV is set to a valid environment value.
    
    Args:
        env: The environment value to validate
        
    Returns:
        bool: True if environment is valid
        
    Raises:
        ValueError: If environment is invalid
    """
    if env not in VALID_ENVIRONMENTS:
        error_msg = (
            f"Invalid DJANGO_ENV value: '{env}'. "
            f"Must be one of: {', '.join(VALID_ENVIRONMENTS)}"
        )
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    logger.info(f"Validated environment: {env}")
    return True

def validate_settings(settings_module) -> bool:
    """
    Validates that all required settings are present and properly configured.
    
    Args:
        settings_module: The imported settings module to validate
        
    Returns:
        bool: True if all required settings are present and valid
        
    Raises:
        ValueError: If required settings are missing or invalid
    """
    # Required Django settings
    required_settings = [
        'SECRET_KEY',
        'DEBUG',
        'ALLOWED_HOSTS',
        'DATABASES',
        'INSTALLED_APPS',
        'MIDDLEWARE',
    ]
    
    # Environment-specific required settings
    if DJANGO_ENV == 'production':
        required_settings.extend([
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_STORAGE_BUCKET_NAME',
            'SENTRY_DSN'
        ])
    elif DJANGO_ENV == 'staging':
        required_settings.extend([
            'STAGING_ENVIRONMENT',
            'SENTRY_DSN'
        ])
    
    # Validate security settings
    security_settings = [
        'SECURE_SSL_REDIRECT',
        'SESSION_COOKIE_SECURE',
        'CSRF_COOKIE_SECURE',
        'SECURE_HSTS_SECONDS'
    ]
    
    # Validate monitoring settings
    monitoring_settings = [
        'LOGGING',
        'PROMETHEUS_METRICS_EXPORT_PORT'
    ]
    
    # Combine all required settings
    all_required = required_settings + security_settings + monitoring_settings
    
    # Check for missing settings
    missing_settings = [
        setting for setting in all_required 
        if not hasattr(settings_module, setting)
    ]
    
    if missing_settings:
        error_msg = (
            f"Missing required settings in {DJANGO_ENV} environment: "
            f"{', '.join(missing_settings)}"
        )
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    # Validate DEBUG setting for production
    if DJANGO_ENV == 'production' and getattr(settings_module, 'DEBUG', False):
        error_msg = "DEBUG must be False in production environment"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    logger.info(f"Successfully validated all required settings for {DJANGO_ENV}")
    return True

def load_settings():
    """
    Dynamically imports and loads environment-specific settings with validation 
    and error handling.
    
    Returns:
        module: The loaded settings module for the current environment
        
    Raises:
        ImportError: If settings module cannot be imported
        ValueError: If environment or settings validation fails
    """
    try:
        # Validate environment
        validate_environment(DJANGO_ENV)
        
        logger.info(f"Loading settings for environment: {DJANGO_ENV}")
        
        # Import environment-specific settings module
        settings_module = import_module(SETTINGS_MODULE)
        
        # Validate settings
        validate_settings(settings_module)
        
        logger.info(f"Successfully loaded settings from {SETTINGS_MODULE}")
        return settings_module
        
    except ImportError as e:
        error_msg = (
            f"Failed to import settings module '{SETTINGS_MODULE}'. "
            f"Error: {str(e)}"
        )
        logger.critical(error_msg)
        raise ImportError(error_msg) from e
    
    except Exception as e:
        error_msg = (
            f"Error loading settings for environment '{DJANGO_ENV}'. "
            f"Error: {str(e)}"
        )
        logger.critical(error_msg)
        raise

# Load settings on module import
settings_module = load_settings()

# Import all settings into the module namespace
globals().update({
    name: getattr(settings_module, name)
    for name in dir(settings_module)
    if not name.startswith('_')
})

# Export settings module name for Django
SETTINGS_MODULE_NAME = SETTINGS_MODULE

__all__ = ['DJANGO_ENV', 'SETTINGS_MODULE', 'SETTINGS_MODULE_NAME']