"""
Core utilities package initialization module for Arena MVP platform.

This module exposes essential validation, encryption and utility functions used across
the platform, implementing comprehensive security and validation capabilities.

Version: 1.0.0
"""

# Import encryption utilities
from core.utils.encryption import (
    encrypt_data as encrypt_field,  # Aliased for clarity
    decrypt_data as decrypt_field,  # Aliased for clarity
    mask_pii as mask_sensitive_data,  # Aliased for clarity
    EncryptionContext as FieldEncryption  # Aliased for clarity
)

# Import validation utilities
from core.utils.validators import (
    validate_email,
    validate_password,
    validate_file_upload,
    validate_text_input as sanitize_text_input,  # Aliased for clarity
    DataValidator as validate_request_fields  # Aliased for clarity
)

# Version information
__version__ = '1.0.0'

# Define public interface
__all__ = [
    # Encryption utilities
    'encrypt_field',
    'decrypt_field', 
    'mask_sensitive_data',
    'FieldEncryption',
    
    # Validation utilities
    'validate_email',
    'validate_password',
    'validate_file_upload',
    'sanitize_text_input',
    'validate_request_fields'
]

# Module level docstring for each exposed function
encrypt_field.__doc__ = """
Encrypts sensitive field data using AES-256-GCM with AWS KMS key management.

Args:
    data: Data to encrypt (string, bytes, or dictionary)
    classification: Data classification level from DataClassification enum

Returns:
    str: Base64 encoded encrypted data
"""

decrypt_field.__doc__ = """
Decrypts encrypted field data using the corresponding encryption key.

Args:
    encrypted_data: Base64 encoded encrypted data string

Returns:
    Union[str, bytes, dict]: Original decrypted data
"""

mask_sensitive_data.__doc__ = """
Masks personally identifiable information (PII) in text data.

Args:
    data: String containing potential PII
    mask_char: Character to use for masking (default: '*')

Returns:
    str: Text with PII masked
"""

FieldEncryption.__doc__ = """
Secure context manager for field encryption operations.

Usage:
    with FieldEncryption(data, classification) as encrypted_data:
        # Use encrypted_data securely
"""

validate_email.__doc__ = """
Validates email format and business domain requirements.

Args:
    email: Email address to validate

Returns:
    bool: True if email is valid

Raises:
    ValidationError: If email validation fails
"""

validate_password.__doc__ = """
Validates password strength requirements.

Args:
    password: Password to validate

Returns:
    bool: True if password meets requirements

Raises:
    ValidationError: If password requirements not met
"""

validate_file_upload.__doc__ = """
Validates file uploads for type and size restrictions.

Args:
    uploaded_file: File object to validate

Returns:
    bool: True if file is valid

Raises:
    ValidationError: If file validation fails
"""

sanitize_text_input.__doc__ = """
Validates and sanitizes text input with enhanced security checks.

Args:
    text: Text to validate
    max_length: Maximum allowed length
    required: Whether the field is required (default: True)
    custom_rules: Additional validation rules (optional)

Returns:
    bool: True if text is valid

Raises:
    ValidationError: If validation fails
"""

validate_request_fields.__doc__ = """
Enhanced validation class with classification-based rules and security features.

Args:
    classification_level: Data classification level from DataClassification enum
    custom_rules: Additional validation rules (optional)

Methods:
    validate(data: Dict[str, Any]) -> bool: Validates data according to classification rules
"""