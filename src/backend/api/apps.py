"""
Django application configuration for the Arena MVP REST API module.
Defines core settings, versioning, authentication, and rate limiting configuration.

Version: 4.2+
"""

from django.apps import AppConfig  # Django 4.2+
from django.conf import settings
from rest_framework.versioning import URLPathVersioning
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class ApiConfig(AppConfig):
    """
    Django application configuration class for the Arena API module.
    Defines core settings for API versioning, authentication, rate limiting and monitoring.
    """
    
    # Basic application configuration
    name = 'api'
    verbose_name = 'Arena API'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        """
        Performs API module initialization when Django signals the application is ready.
        Configures API versioning, authentication, rate limiting and monitoring settings.
        """
        # Import API URLs module
        import api.urls  # noqa

        # Configure API versioning settings
        settings.REST_FRAMEWORK['DEFAULT_VERSIONING_CLASS'] = 'rest_framework.versioning.URLPathVersioning'
        settings.REST_FRAMEWORK['ALLOWED_VERSIONS'] = ['v1']
        settings.REST_FRAMEWORK['DEFAULT_VERSION'] = 'v1'
        settings.REST_FRAMEWORK['VERSION_PARAM'] = 'version'

        # Configure authentication classes
        settings.REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] = [
            'rest_framework_simplejwt.authentication.JWTAuthentication',
            'rest_framework.authentication.SessionAuthentication',
        ]

        # Configure rate limiting
        settings.REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
            'rest_framework.throttling.AnonRateThrottle',
            'rest_framework.throttling.UserRateThrottle',
        ]
        settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
            'anon': '100/minute',  # Anonymous user rate limit
            'user': '100/minute',  # Authenticated user rate limit
            'burst': '150/minute', # Burst rate limit
        }

        # Configure version deprecation warnings
        settings.REST_FRAMEWORK['DEPRECATED_VERSIONS'] = []

        # Configure CORS settings
        settings.CORS_ALLOW_CREDENTIALS = True
        settings.CORS_ALLOWED_ORIGINS = [
            'https://arena-mvp.com',
            'https://staging.arena-mvp.com',
        ]
        if settings.DEBUG:
            settings.CORS_ALLOWED_ORIGINS.append('http://localhost:3000')

        # Configure API monitoring and logging
        settings.REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
            'rest_framework.renderers.JSONRenderer',
        ]
        if settings.DEBUG:
            settings.REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'].append(
                'rest_framework.renderers.BrowsableAPIRenderer'
            )

        # Configure exception handling
        settings.REST_FRAMEWORK['EXCEPTION_HANDLER'] = 'api.exceptions.custom_exception_handler'

        # Configure schema generation
        settings.REST_FRAMEWORK['DEFAULT_SCHEMA_CLASS'] = 'rest_framework.schemas.openapi.AutoSchema'