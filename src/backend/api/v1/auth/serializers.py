"""
Authentication serializers for the Arena MVP platform.

This module implements secure serializers for:
- Magic link authentication
- Google OAuth authentication 
- User profile data
with enhanced security controls and business domain validation.

Version: 1.0.0
"""

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework_extensions.mixins import RateLimitedSerializerMixin

from users.models import User
from core.utils.validators import validate_email, validate_text_input
from core.constants import ERROR_CODE_RANGES

class MagicLinkSerializer(RateLimitedSerializerMixin, serializers.Serializer):
    """
    Serializer for magic link authentication requests with enhanced security and 
    business domain validation.
    """

    email = serializers.EmailField(
        required=True,
        help_text="Business email address for authentication"
    )

    class Meta:
        rate_limit = "3/hour"

    def validate_email(self, value: str) -> str:
        """
        Validate email format and business domain with enhanced security.

        Args:
            value: Email address to validate

        Returns:
            Validated email address

        Raises:
            ValidationError: If validation fails
        """
        try:
            # Apply rate limiting check
            self.check_rate_limit()

            # Validate email format and business domain
            validate_email(value)

            return value.lower().strip()

        except ValidationError as e:
            raise ValidationError(
                detail=str(e),
                code=ERROR_CODE_RANGES["AUTHENTICATION"]["INVALID_CREDENTIALS"]
            )

class GoogleAuthSerializer(RateLimitedSerializerMixin, serializers.Serializer):
    """
    Serializer for Google OAuth authentication with enhanced security controls.
    """

    auth_code = serializers.CharField(
        required=True,
        help_text="Google OAuth authorization code"
    )

    class Meta:
        rate_limit = "3/hour"

    def validate_auth_code(self, value: str) -> str:
        """
        Validate Google OAuth authorization code with security checks.

        Args:
            value: Authorization code to validate

        Returns:
            Validated authorization code

        Raises:
            ValidationError: If validation fails
        """
        try:
            # Apply rate limiting check
            self.check_rate_limit()

            # Basic format validation
            if not value or len(value) < 20:
                raise ValidationError(
                    "Invalid authorization code format",
                    code=ERROR_CODE_RANGES["AUTHENTICATION"]["INVALID_CREDENTIALS"]
                )

            # Validate code format and check for security threats
            validate_text_input(
                text=value,
                max_length=1000,
                required=True,
                custom_rules={
                    "no_suspicious_patterns": lambda x: not any(
                        pattern in x.lower() 
                        for pattern in ["script", "eval", "function"]
                    )
                }
            )

            return value.strip()

        except ValidationError as e:
            raise ValidationError(
                detail=str(e),
                code=ERROR_CODE_RANGES["AUTHENTICATION"]["INVALID_CREDENTIALS"]
            )

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile data with enhanced validation and security controls.
    """

    email = serializers.EmailField(read_only=True)
    full_name = serializers.CharField(
        required=True,
        max_length=255,
        help_text="User's full name"
    )
    company = serializers.CharField(
        required=True,
        max_length=255,
        help_text="User's company name"
    )
    role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'company', 'role']
        read_only_fields = ['email', 'role']

    def validate_full_name(self, value: str) -> str:
        """
        Validate user's full name with XSS prevention.

        Args:
            value: Full name to validate

        Returns:
            Validated and sanitized full name

        Raises:
            ValidationError: If validation fails
        """
        try:
            validate_text_input(
                text=value,
                max_length=255,
                required=True
            )
            return value.strip()

        except ValidationError as e:
            raise ValidationError(
                detail=str(e),
                code=ERROR_CODE_RANGES["REQUEST"]["INVALID_FORMAT"]
            )

    def validate_company(self, value: str) -> str:
        """
        Validate company name with enhanced security.

        Args:
            value: Company name to validate

        Returns:
            Validated and sanitized company name

        Raises:
            ValidationError: If validation fails
        """
        try:
            validate_text_input(
                text=value,
                max_length=255,
                required=True
            )
            return value.strip()

        except ValidationError as e:
            raise ValidationError(
                detail=str(e),
                code=ERROR_CODE_RANGES["REQUEST"]["INVALID_FORMAT"]
            )