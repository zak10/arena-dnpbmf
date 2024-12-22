"""
Core validation utilities for the Arena MVP platform.

This module provides comprehensive data validation capabilities including:
- Input validation for forms and API requests
- Format checking for various data types
- Business rule validation
- Security-focused validation rules
- Classification-based validation

Version: 1.0.0
"""

import re
import logging
from typing import Dict, Any, Optional, Union
import magic  # version 0.4.27
from email_validator import validate_email as validate_email_format, EmailNotValidError  # version 2.0.0
from core.exceptions import ValidationError
from core.constants import DataClassification

# Configure logging
logger = logging.getLogger(__name__)

# Regular expression patterns
EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$'
PASSWORD_REGEX = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'

# File upload constraints
ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
MAX_FILE_SIZE_BYTES = 10_485_760  # 10MB

# XSS prevention patterns
XSS_PATTERNS = [
    r'<script.*?>.*?</script>',
    r'javascript:',
    r'on\w+\s*=',
    r'data:text/html',
]

def validate_email(email: str) -> bool:
    """
    Validates email format and business domain requirements.

    Args:
        email: Email address to validate

    Returns:
        bool: True if email is valid

    Raises:
        ValidationError: If email validation fails
    """
    if not email or not isinstance(email, str):
        raise ValidationError("Email is required", code="E2002")

    # Basic format validation
    if not re.match(EMAIL_REGEX, email):
        raise ValidationError("Invalid email format", code="E2001")

    try:
        # RFC 5322 compliance check
        valid = validate_email_format(email, check_deliverability=False)
        email = valid.email
    except EmailNotValidError as e:
        raise ValidationError(f"Invalid email: {str(e)}", code="E2001")

    # Business domain validation
    domain = email.split('@')[1].lower()
    if domain in ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']:
        raise ValidationError("Please use a business email address", code="E2001")

    return True

def validate_password(password: str) -> bool:
    """
    Validates password strength requirements.

    Args:
        password: Password to validate

    Returns:
        bool: True if password meets requirements

    Raises:
        ValidationError: If password requirements not met
    """
    if not password or not isinstance(password, str):
        raise ValidationError("Password is required", code="E2002")

    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long", code="E2001")

    if not re.match(PASSWORD_REGEX, password):
        raise ValidationError(
            "Password must contain at least one uppercase letter, "
            "one lowercase letter, one number, and one special character",
            code="E2001"
        )

    return True

def validate_file_upload(uploaded_file: Any) -> bool:
    """
    Validates file uploads for type and size restrictions.

    Args:
        uploaded_file: File object to validate

    Returns:
        bool: True if file is valid

    Raises:
        ValidationError: If file validation fails
    """
    if not uploaded_file:
        raise ValidationError("No file provided", code="E2002")

    # Size validation
    if uploaded_file.size > MAX_FILE_SIZE_BYTES:
        raise ValidationError(
            f"File size exceeds maximum limit of {MAX_FILE_SIZE_BYTES/1_048_576}MB",
            code="E2001"
        )

    # File type validation
    try:
        file_type = magic.from_buffer(uploaded_file.read(2048), mime=True)
        uploaded_file.seek(0)  # Reset file pointer
        
        if file_type not in ALLOWED_FILE_TYPES:
            raise ValidationError(
                "Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX",
                code="E2001"
            )
    except Exception as e:
        raise ValidationError(f"File type detection failed: {str(e)}", code="E2003")

    return True

def validate_text_input(
    text: str,
    max_length: int,
    required: bool = True,
    custom_rules: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Validates text input with enhanced security checks.

    Args:
        text: Text to validate
        max_length: Maximum allowed length
        required: Whether the field is required
        custom_rules: Additional validation rules

    Returns:
        bool: True if text is valid

    Raises:
        ValidationError: If validation fails
    """
    if required and not text:
        raise ValidationError("Text input is required", code="E2002")

    if not text:
        return True

    if not isinstance(text, str):
        raise ValidationError("Input must be a string", code="E2001")

    # Enhanced whitespace handling
    text = ' '.join(text.split())

    if len(text) > max_length:
        raise ValidationError(
            f"Text exceeds maximum length of {max_length} characters",
            code="E2001"
        )

    # XSS pattern detection
    for pattern in XSS_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            raise ValidationError("Invalid characters detected", code="E2001")

    # Apply custom validation rules
    if custom_rules:
        for rule_name, rule_func in custom_rules.items():
            try:
                if not rule_func(text):
                    raise ValidationError(
                        f"Failed custom validation rule: {rule_name}",
                        code="E2001"
                    )
            except Exception as e:
                logger.error(f"Custom validation rule '{rule_name}' failed: {str(e)}")
                raise ValidationError("Validation error occurred", code="E2001")

    return True

def sanitize_input(input_data: str) -> str:
    """
    Sanitizes input data to prevent XSS and injection attacks.

    Args:
        input_data: String to sanitize

    Returns:
        str: Sanitized string
    """
    if not isinstance(input_data, str):
        return ""

    # Remove HTML tags
    cleaned = re.sub(r'<[^>]*>', '', input_data)

    # Escape special characters
    cleaned = (
        cleaned.replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
        .replace("'", '&#x27;')
    )

    # Remove potentially dangerous patterns
    for pattern in XSS_PATTERNS:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)

    return cleaned.strip()

class DataValidator:
    """
    Enhanced validation class with classification-based rules and security features.
    """

    def __init__(
        self,
        classification_level: DataClassification,
        custom_rules: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Initialize validator with classification level and security rules.

        Args:
            classification_level: Data classification level
            custom_rules: Additional validation rules
        """
        self._classification_level = classification_level
        self._validation_rules = self._get_validation_rules()
        self._security_rules = self._get_security_rules()
        self._custom_rules = custom_rules or {}
        self._performance_metrics = {'validations': 0, 'failures': 0}

    def _get_validation_rules(self) -> Dict[str, Any]:
        """Get validation rules based on classification level."""
        base_rules = {
            'max_length': 1000,
            'required': True,
            'allow_html': False
        }

        if self._classification_level == DataClassification.HIGHLY_SENSITIVE:
            base_rules.update({
                'max_length': 500,
                'encryption_required': True,
                'audit_logging': True
            })
        elif self._classification_level == DataClassification.SENSITIVE:
            base_rules.update({
                'max_length': 750,
                'encryption_required': True
            })

        return base_rules

    def _get_security_rules(self) -> Dict[str, Any]:
        """Get security rules based on classification level."""
        base_security = {
            'sanitize_input': True,
            'xss_protection': True
        }

        if self._classification_level == DataClassification.HIGHLY_SENSITIVE:
            base_security.update({
                'field_encryption': True,
                'audit_trail': True,
                'strict_validation': True
            })
        elif self._classification_level == DataClassification.SENSITIVE:
            base_security.update({
                'field_encryption': True,
                'strict_validation': True
            })

        return base_security

    def validate(self, data: Dict[str, Any]) -> bool:
        """
        Validate data according to classification rules with enhanced security.

        Args:
            data: Dictionary of data to validate

        Returns:
            bool: True if valid

        Raises:
            ValidationError: If validation fails
        """
        self._performance_metrics['validations'] += 1

        try:
            # Required fields check
            if self._validation_rules['required']:
                missing_fields = [k for k, v in data.items() if not v]
                if missing_fields:
                    raise ValidationError(
                        f"Missing required fields: {', '.join(missing_fields)}",
                        code="E2002"
                    )

            # Apply validation rules
            for field, value in data.items():
                if isinstance(value, str):
                    # Length validation
                    if len(value) > self._validation_rules['max_length']:
                        raise ValidationError(
                            f"Field '{field}' exceeds maximum length",
                            code="E2001"
                        )

                    # Security validations
                    if self._security_rules['sanitize_input']:
                        value = sanitize_input(value)

                    # Custom validations
                    if field in self._custom_rules:
                        if not self._custom_rules[field](value):
                            raise ValidationError(
                                f"Custom validation failed for field '{field}'",
                                code="E2001"
                            )

            return True

        except ValidationError:
            self._performance_metrics['failures'] += 1
            raise

        except Exception as e:
            self._performance_metrics['failures'] += 1
            logger.error(f"Validation error: {str(e)}")
            raise ValidationError("Validation error occurred", code="E2001")