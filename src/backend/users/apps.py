"""
Django application configuration for the users module of the Arena MVP platform.

This module configures:
- User authentication settings (magic link, Google OAuth)
- Role-based access control
- User data security and encryption
- Session management
- Security event logging

Version: 1.0.0
"""

from django.apps import AppConfig  # Django 4.2+
from django.db.models.signals import post_migrate
from django.conf import settings

class UsersConfig(AppConfig):
    """
    Django application configuration class for the users module, handling
    authentication, authorization, and role management.
    """
    
    name = 'users'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'User Management'

    def ready(self):
        """
        Performs user application initialization when Django starts, setting up
        authentication, roles, and security.
        """
        # Import user model and signal handlers
        from users.models import User
        from users.signals import (
            initialize_user_roles,
            handle_user_login,
            handle_user_logout,
            handle_password_change,
            handle_security_event
        )

        # Register post-migration signal for role initialization
        post_migrate.connect(initialize_user_roles, sender=self)

        # Configure authentication backends
        settings.AUTHENTICATION_BACKENDS = [
            'users.auth.MagicLinkBackend',  # Magic link authentication
            'users.auth.GoogleOAuthBackend',  # Google OAuth
            'django.contrib.auth.backends.ModelBackend'  # Default backend
        ]

        # Configure session security settings
        settings.SESSION_COOKIE_SECURE = True
        settings.SESSION_COOKIE_HTTPONLY = True
        settings.SESSION_COOKIE_SAMESITE = 'Lax'
        settings.SESSION_COOKIE_AGE = 86400  # 24 hours
        settings.SESSION_EXPIRE_AT_BROWSER_CLOSE = True

        # Configure user data encryption settings
        settings.USER_FIELD_ENCRYPTION_KEY = settings.ENCRYPTION_KEYS['user_fields']
        settings.ENCRYPTED_USER_FIELDS = [
            'full_name',
            'company'
        ]

        # Configure role-based access control middleware
        settings.MIDDLEWARE.append('users.middleware.RoleBasedAccessMiddleware')

        # Set up user activity logging
        settings.USER_ACTIVITY_LOGGER = 'users.logging.UserActivityLogger'
        settings.LOG_USER_EVENTS = [
            'login',
            'logout',
            'password_change',
            'role_change',
            'security_event'
        ]

        # Register user model signal handlers
        User.user_logged_in.connect(handle_user_login)
        User.user_logged_out.connect(handle_user_logout)
        User.password_changed.connect(handle_password_change)
        User.security_event.connect(handle_security_event)

        # Configure magic link settings
        settings.MAGIC_LINK_EXPIRY = 900  # 15 minutes
        settings.MAGIC_LINK_MAX_RETRIES = 3
        settings.MAGIC_LINK_COOLDOWN = 3600  # 1 hour

        # Configure Google OAuth settings
        settings.GOOGLE_OAUTH_SCOPES = [
            'email',
            'profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ]
        settings.GOOGLE_OAUTH_WORKSPACE_ONLY = True

        # Configure user data classification
        settings.USER_DATA_CLASSIFICATION = 'highly_sensitive'
        settings.USER_DATA_RETENTION_DAYS = 30  # After account deletion