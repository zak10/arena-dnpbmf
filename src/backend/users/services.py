"""
User service module for Arena MVP platform implementing secure authentication flows,
role-based access control, and encrypted profile management.

This module provides:
- Magic link and Google OAuth authentication
- Role-based access control
- Encrypted profile management
- Security monitoring and compliance

Version: 1.0.0
"""

import logging
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta

# Third-party imports
import jwt  # version: 2.8.0
from google.auth.transport import requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow  # version: 1.0.0
from celery import shared_task  # version: 5.3+
from django.core.cache import cache  # version: 4.2+
from ratelimit import RateLimiter  # version: 4.0+

# Internal imports
from users.models import User
from core.utils.encryption import encrypt_data, decrypt_data
from notifications.email import EmailService
from core.exceptions import AuthenticationError, SystemError
from core.constants import DataClassification

# Constants
MAGIC_LINK_EXPIRY_MINUTES = 15
JWT_ALGORITHM = 'RS256'
GOOGLE_OAUTH_CLIENT_ID = settings.GOOGLE_OAUTH_CLIENT_ID
MAX_AUTH_ATTEMPTS = 3
AUTH_ATTEMPT_WINDOW = 3600  # 1 hour
SENSITIVE_FIELDS = ['company', 'phone', 'position']

class UserService:
    """
    Comprehensive service class for user management with secure authentication,
    role management, and profile handling.
    """

    def __init__(self, email_service: EmailService, rate_limiter: RateLimiter) -> None:
        """
        Initialize user service with required dependencies.

        Args:
            email_service: Service for sending emails
            rate_limiter: Rate limiting service
        """
        self._email_service = email_service
        self._rate_limiter = rate_limiter
        self._logger = logging.getLogger(__name__)
        self._cache = cache

    @shared_task
    def create_magic_link(self, email: str, ip_address: str) -> bool:
        """
        Generate and send secure magic link with rate limiting.

        Args:
            email: User's email address
            ip_address: Request IP address

        Returns:
            bool: Success status of magic link creation and sending

        Raises:
            AuthenticationError: If rate limit exceeded or validation fails
        """
        try:
            # Check rate limits
            rate_key = f"auth_attempts:{ip_address}"
            if self._cache.get(rate_key, 0) >= MAX_AUTH_ATTEMPTS:
                raise AuthenticationError(
                    message="Too many authentication attempts",
                    code="E1001",
                    details={"ip_address": ip_address}
                )

            # Validate business email domain
            if not self._email_service._ses_client.validate_email_address(email):
                raise AuthenticationError(
                    message="Invalid business email domain",
                    code="E1001",
                    details={"email": email}
                )

            # Generate JWT token
            expiry = datetime.utcnow() + timedelta(minutes=MAGIC_LINK_EXPIRY_MINUTES)
            token_data = {
                "email": email,
                "exp": expiry,
                "type": "magic_link"
            }
            token = jwt.encode(
                token_data,
                settings.JWT_PRIVATE_KEY,
                algorithm=JWT_ALGORITHM
            )

            # Create magic link URL
            magic_link_url = f"{settings.FRONTEND_URL}/auth/verify?token={token}"

            # Send email
            self._email_service.send_magic_link(
                email=email,
                user_name=email.split('@')[0],
                magic_link_url=magic_link_url
            )

            # Update rate limiting
            self._cache.incr(rate_key)
            if not self._cache.ttl(rate_key):
                self._cache.expire(rate_key, AUTH_ATTEMPT_WINDOW)

            # Log authentication attempt
            self._logger.info(
                "Magic link sent",
                extra={
                    "email": email,
                    "ip_address": ip_address,
                    "expiry": expiry
                }
            )

            return True

        except Exception as e:
            self._logger.error(
                "Magic link creation failed",
                extra={
                    "error": str(e),
                    "email": email,
                    "ip_address": ip_address
                }
            )
            raise

    def verify_magic_link(self, token: str, ip_address: str) -> User:
        """
        Verify magic link token and authenticate user with security checks.

        Args:
            token: JWT token from magic link
            ip_address: Request IP address

        Returns:
            User: Authenticated user instance

        Raises:
            AuthenticationError: If token is invalid or expired
        """
        try:
            # Verify JWT signature and expiry
            try:
                payload = jwt.decode(
                    token,
                    settings.JWT_PUBLIC_KEY,
                    algorithms=[JWT_ALGORITHM]
                )
            except jwt.InvalidTokenError as e:
                raise AuthenticationError(
                    message="Invalid or expired magic link",
                    code="E1003",
                    details={"error": str(e)}
                )

            email = payload.get("email")
            if not email:
                raise AuthenticationError(
                    message="Invalid token payload",
                    code="E1003"
                )

            # Check for token reuse
            token_key = f"used_token:{token}"
            if self._cache.get(token_key):
                raise AuthenticationError(
                    message="Magic link already used",
                    code="E1003"
                )
            self._cache.set(token_key, True, timeout=86400)  # 24 hour retention

            # Get or create user
            user = self.get_user_by_email(email)
            if not user:
                user = User.objects.create_buyer(email=email)

            # Update last login
            user.last_login = datetime.utcnow()
            user.save()

            # Send login notification
            self._email_service.send_login_notification(
                email=email,
                ip_address=ip_address
            )

            # Log successful authentication
            self._logger.info(
                "Magic link authentication successful",
                extra={
                    "user_id": str(user.id),
                    "email": email,
                    "ip_address": ip_address
                }
            )

            return user

        except Exception as e:
            self._logger.error(
                "Magic link verification failed",
                extra={
                    "error": str(e),
                    "ip_address": ip_address
                }
            )
            raise

    def authenticate_google(self, auth_code: str, ip_address: str) -> User:
        """
        Authenticate user with Google OAuth and business email validation.

        Args:
            auth_code: Google OAuth authorization code
            ip_address: Request IP address

        Returns:
            User: Authenticated user instance

        Raises:
            AuthenticationError: If authentication fails
        """
        try:
            # Check rate limits
            rate_key = f"auth_attempts:{ip_address}"
            if self._cache.get(rate_key, 0) >= MAX_AUTH_ATTEMPTS:
                raise AuthenticationError(
                    message="Too many authentication attempts",
                    code="E1001",
                    details={"ip_address": ip_address}
                )

            # Verify Google OAuth code
            try:
                flow = Flow.from_client_secrets_file(
                    settings.GOOGLE_OAUTH_CLIENT_SECRETS_FILE,
                    scopes=['openid', 'email', 'profile']
                )
                flow.fetch_token(code=auth_code)
                credentials = flow.credentials
                
                id_info = id_token.verify_oauth2_token(
                    credentials.id_token,
                    requests.Request(),
                    GOOGLE_OAUTH_CLIENT_ID
                )
            except Exception as e:
                raise AuthenticationError(
                    message="Invalid Google OAuth token",
                    code="E1001",
                    details={"error": str(e)}
                )

            email = id_info.get('email')
            if not email:
                raise AuthenticationError(
                    message="Email not provided in OAuth response",
                    code="E1001"
                )

            # Validate business email
            if not self._email_service._ses_client.validate_email_address(email):
                raise AuthenticationError(
                    message="Invalid business email domain",
                    code="E1001",
                    details={"email": email}
                )

            # Get or create user
            user = self.get_user_by_email(email)
            if not user:
                user = User.objects.create_buyer(
                    email=email,
                    full_name=id_info.get('name', '')
                )

            # Update last login
            user.last_login = datetime.utcnow()
            user.save()

            # Send login notification
            self._email_service.send_login_notification(
                email=email,
                ip_address=ip_address
            )

            # Update rate limiting
            self._cache.incr(rate_key)
            if not self._cache.ttl(rate_key):
                self._cache.expire(rate_key, AUTH_ATTEMPT_WINDOW)

            # Log successful authentication
            self._logger.info(
                "Google OAuth authentication successful",
                extra={
                    "user_id": str(user.id),
                    "email": email,
                    "ip_address": ip_address
                }
            )

            return user

        except Exception as e:
            self._logger.error(
                "Google OAuth authentication failed",
                extra={
                    "error": str(e),
                    "ip_address": ip_address
                }
            )
            raise

    def update_user_profile(self, user: User, profile_data: Dict) -> User:
        """
        Update user profile with field-level encryption.

        Args:
            user: User instance to update
            profile_data: Dictionary of profile fields to update

        Returns:
            User: Updated user instance

        Raises:
            SystemError: If profile update fails
        """
        try:
            # Validate profile data schema
            allowed_fields = {'full_name', 'company', 'phone', 'position'}
            invalid_fields = set(profile_data.keys()) - allowed_fields
            if invalid_fields:
                raise SystemError(
                    message="Invalid profile fields",
                    code="E4001",
                    details={"invalid_fields": list(invalid_fields)}
                )

            # Encrypt sensitive fields
            for field in SENSITIVE_FIELDS:
                if field in profile_data:
                    profile_data[field] = encrypt_data(
                        profile_data[field],
                        DataClassification.HIGHLY_SENSITIVE
                    )

            # Update user model
            for field, value in profile_data.items():
                setattr(user, field, value)
            user.save()

            # Invalidate user cache
            self._cache.delete(f"user:{user.email}")

            # Log profile update
            self._logger.info(
                "User profile updated",
                extra={
                    "user_id": str(user.id),
                    "updated_fields": list(profile_data.keys())
                }
            )

            return user

        except Exception as e:
            self._logger.error(
                "Profile update failed",
                extra={
                    "error": str(e),
                    "user_id": str(user.id)
                }
            )
            raise

    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Retrieve user by email with caching.

        Args:
            email: User's email address

        Returns:
            Optional[User]: User instance if found
        """
        # Check cache first
        cache_key = f"user:{email}"
        user = self._cache.get(cache_key)
        if user:
            return user

        # Query database
        try:
            user = User.objects.get(email=email)
            # Cache user object
            self._cache.set(cache_key, user, timeout=3600)  # 1 hour cache
            return user
        except User.DoesNotExist:
            return None