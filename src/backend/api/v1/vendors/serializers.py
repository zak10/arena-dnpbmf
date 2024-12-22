"""
Serializer classes for handling vendor data serialization and validation in the Arena MVP platform API.

This module implements:
- Secure vendor data serialization with field-level encryption
- Comprehensive input validation with security controls
- Data classification-based access controls
- Standardized error handling

Version: 1.0.0
"""

from rest_framework import serializers  # version 3.14+
from django.core.validators import URLValidator  # version 4.2+
from django_encrypted_fields import encrypt_field  # version 2.1+

from vendors.models import Vendor
from core.utils.validators import validate_text_input
from core.exceptions import ValidationError
from core.constants import DataClassification

# Configure URL validator with HTTPS requirement
url_validator = URLValidator(schemes=['https'])

class VendorSerializer(serializers.ModelSerializer):
    """
    Serializer for handling vendor data with enhanced security controls and validation.
    
    Implements:
    - Field-level encryption for sensitive data
    - XSS and injection protection
    - Data classification validation
    - Comprehensive input validation
    """

    class Meta:
        model = Vendor
        fields = ['id', 'name', 'website', 'description', 'status', 'capabilities']
        read_only_fields = ['id', 'status']

    def validate_name(self, value):
        """
        Validate vendor name with security controls and encryption.

        Args:
            value: Vendor name to validate

        Returns:
            str: Validated and encrypted name value if sensitive

        Raises:
            ValidationError: If validation fails
        """
        try:
            # Apply text validation with security controls
            validate_text_input(
                text=value,
                max_length=100,
                required=True,
                custom_rules={'no_special_chars': lambda x: x.replace(' ', '').isalnum()}
            )

            # Check for uniqueness case-insensitively
            if Vendor.objects.filter(name__iexact=value).exists():
                raise ValidationError(
                    "A vendor with this name already exists",
                    code="E2001"
                )

            # Encrypt if classified as sensitive
            if self.context.get('data_classification') in [
                DataClassification.SENSITIVE.value,
                DataClassification.HIGHLY_SENSITIVE.value
            ]:
                return encrypt_field(value)

            return value

        except ValidationError as e:
            raise serializers.ValidationError(str(e))

    def validate_website(self, value):
        """
        Validate vendor website URL with security checks.

        Args:
            value: Website URL to validate

        Returns:
            str: Validated website URL

        Raises:
            ValidationError: If validation fails
        """
        try:
            # Enforce HTTPS
            url_validator(value)

            # Additional security checks
            if any(domain in value.lower() for domain in [
                'localhost', '127.0.0.1', '.internal'
            ]):
                raise ValidationError(
                    "Invalid website domain",
                    code="E2001"
                )

            return value

        except ValidationError as e:
            raise serializers.ValidationError(str(e))

    def validate_description(self, value):
        """
        Validate vendor description with content security controls.

        Args:
            value: Description text to validate

        Returns:
            str: Validated description

        Raises:
            ValidationError: If validation fails
        """
        try:
            # Apply text validation with security controls
            validate_text_input(
                text=value,
                max_length=1000,
                required=True
            )

            # Encrypt if highly sensitive
            if self.context.get('data_classification') == DataClassification.HIGHLY_SENSITIVE.value:
                return encrypt_field(value)

            return value

        except ValidationError as e:
            raise serializers.ValidationError(str(e))

    def validate_capabilities(self, value):
        """
        Validate vendor capabilities with schema versioning and security controls.

        Args:
            value: Capabilities dictionary to validate

        Returns:
            dict: Validated capabilities

        Raises:
            ValidationError: If validation fails
        """
        try:
            if not isinstance(value, dict):
                raise ValidationError(
                    "Capabilities must be a dictionary",
                    code="E2001"
                )

            # Validate required capability fields
            required_fields = ['categories', 'features', 'pricing_model']
            missing_fields = [f for f in required_fields if f not in value]
            if missing_fields:
                raise ValidationError(
                    f"Missing required capability fields: {', '.join(missing_fields)}",
                    code="E2002"
                )

            # Validate data types
            if not isinstance(value.get('categories', []), list):
                raise ValidationError("Categories must be a list", code="E2001")
            if not isinstance(value.get('features', []), list):
                raise ValidationError("Features must be a list", code="E2001")
            if not isinstance(value.get('pricing_model', {}), dict):
                raise ValidationError("Pricing model must be a dictionary", code="E2001")

            # Encrypt sensitive pricing data if required
            if self.context.get('data_classification') in [
                DataClassification.SENSITIVE.value,
                DataClassification.HIGHLY_SENSITIVE.value
            ] and 'pricing_model' in value:
                value['pricing_model'] = encrypt_field(value['pricing_model'])

            return value

        except ValidationError as e:
            raise serializers.ValidationError(str(e))

class VendorListSerializer(serializers.ModelSerializer):
    """
    Serializer for vendor list views with limited fields and data classification.
    
    Implements:
    - Restricted field visibility
    - Read-only access
    - Basic data classification
    """

    class Meta:
        model = Vendor
        fields = ['id', 'name', 'status']
        read_only_fields = ['id', 'status']