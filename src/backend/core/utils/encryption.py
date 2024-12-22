"""
Encryption utility module for Arena MVP platform.

Provides secure encryption and decryption capabilities using:
- AWS KMS for key management
- AES-256-GCM for data encryption
- Comprehensive security controls and monitoring

Version: 1.0.0
"""

import os
import re
import json
import logging
from typing import Dict, Union, Optional, Pattern, Type, TracebackType
from base64 import b64encode, b64decode

# Third-party imports
import boto3  # version 1.26.0
from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # version 41.0.0
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidTag

# Internal imports
from core.constants import DataClassification
from core.exceptions import BaseArenaException

# Configure logging
logger = logging.getLogger(__name__)

# Global Constants
KMS_KEY_ID = os.getenv('AWS_KMS_KEY_ID')
ENCRYPTION_ALGORITHM = 'AES-256-GCM'
VERSION_IDENTIFIER = 'v1'  # For future encryption format changes

# PII detection patterns
PII_PATTERNS: Dict[str, Pattern] = {
    'email': re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'),
    'phone': re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'),
    'ssn': re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
    'credit_card': re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b')
}

class EncryptionError(BaseArenaException):
    """Custom exception for encryption-related errors."""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            code="E4004",  # System error range
            status_code=500,
            details=details
        )

class EncryptionContext:
    """Secure context manager for encryption operations."""
    
    def __init__(self, data: Union[str, bytes, dict], classification: DataClassification):
        """Initialize encryption context with secure handling."""
        self._data = data
        self._classification = classification
        self._kms_client = boto3.client('kms', config=boto3.Config(
            retries=dict(max_attempts=3)
        ))
        
    def __enter__(self) -> str:
        """Enter context and encrypt data securely."""
        try:
            return encrypt_data(self._data, self._classification)
        except Exception as e:
            logger.error(f"Encryption context error: {str(e)}")
            raise EncryptionError("Failed to encrypt data in context")

    def __exit__(self, exc_type: Optional[Type[BaseException]], 
                 exc_val: Optional[BaseException], 
                 exc_tb: Optional[TracebackType]) -> None:
        """Clean up resources and handle exceptions."""
        try:
            # Securely clear sensitive data
            self._data = None
            self._classification = None
            
            # Close KMS client
            if hasattr(self._kms_client, 'close'):
                self._kms_client.close()
        except Exception as e:
            logger.error(f"Error in encryption context cleanup: {str(e)}")
        finally:
            self._kms_client = None

def encrypt_data(data: Union[str, bytes, dict], classification: DataClassification) -> str:
    """
    Encrypts data using AES-256-GCM with keys from AWS KMS.
    
    Args:
        data: Data to encrypt (string, bytes, or dictionary)
        classification: Data classification level
        
    Returns:
        Base64 encoded encrypted data with IV and authentication tag
        
    Raises:
        EncryptionError: If encryption fails
    """
    try:
        # Convert input to bytes
        if isinstance(data, dict):
            data = json.dumps(data).encode()
        elif isinstance(data, str):
            data = data.encode()
        
        # Generate random IV
        iv = os.urandom(12)  # 96 bits for GCM
        
        # Get encryption key from KMS
        kms_client = boto3.client('kms')
        key_response = kms_client.generate_data_key(
            KeyId=KMS_KEY_ID,
            KeySpec='AES_256'
        )
        data_key = key_response['Plaintext']
        encrypted_key = key_response['CiphertextBlob']
        
        # Create cipher and encrypt
        aesgcm = AESGCM(data_key)
        ciphertext = aesgcm.encrypt(iv, data, None)
        
        # Combine components
        encrypted_data = {
            'version': VERSION_IDENTIFIER,
            'key': b64encode(encrypted_key).decode(),
            'iv': b64encode(iv).decode(),
            'data': b64encode(ciphertext[:-16]).decode(),
            'tag': b64encode(ciphertext[-16:]).decode()
        }
        
        # Encode final result
        result = b64encode(json.dumps(encrypted_data).encode()).decode()
        
        logger.info(
            f"Data encrypted successfully",
            extra={
                'classification': classification.value,
                'version': VERSION_IDENTIFIER
            }
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Encryption error: {str(e)}")
        raise EncryptionError("Failed to encrypt data", {'error': str(e)})
    finally:
        # Securely clear sensitive data
        if 'data_key' in locals():
            data_key = None

def decrypt_data(encrypted_data: str) -> Union[str, bytes, dict]:
    """
    Decrypts data encrypted by encrypt_data.
    
    Args:
        encrypted_data: Base64 encoded encrypted data
        
    Returns:
        Original decrypted data
        
    Raises:
        EncryptionError: If decryption fails
    """
    try:
        # Decode input
        encrypted_dict = json.loads(b64decode(encrypted_data))
        
        # Verify version
        if encrypted_dict['version'] != VERSION_IDENTIFIER:
            raise EncryptionError("Unsupported encryption version")
        
        # Decode components
        encrypted_key = b64decode(encrypted_dict['key'])
        iv = b64decode(encrypted_dict['iv'])
        ciphertext = b64decode(encrypted_dict['data'])
        tag = b64decode(encrypted_dict['tag'])
        
        # Get decryption key from KMS
        kms_client = boto3.client('kms')
        key_response = kms_client.decrypt(
            CiphertextBlob=encrypted_key,
            KeyId=KMS_KEY_ID
        )
        data_key = key_response['Plaintext']
        
        # Decrypt data
        aesgcm = AESGCM(data_key)
        decrypted_data = aesgcm.decrypt(iv, ciphertext + tag, None)
        
        # Try to convert to original format
        try:
            return json.loads(decrypted_data)
        except json.JSONDecodeError:
            return decrypted_data.decode()
            
    except InvalidTag:
        raise EncryptionError("Data integrity check failed")
    except Exception as e:
        logger.error(f"Decryption error: {str(e)}")
        raise EncryptionError("Failed to decrypt data", {'error': str(e)})
    finally:
        # Securely clear sensitive data
        if 'data_key' in locals():
            data_key = None

def mask_pii(data: str, mask_char: str = '*') -> str:
    """
    Masks personally identifiable information using configurable patterns.
    
    Args:
        data: String containing potential PII
        mask_char: Character to use for masking
        
    Returns:
        String with PII masked
    """
    try:
        masked_data = data
        
        for pattern_name, pattern in PII_PATTERNS.items():
            matches = pattern.finditer(masked_data)
            for match in matches:
                # Preserve some characters based on pattern
                if pattern_name == 'email':
                    # Keep domain
                    email_parts = match.group().split('@')
                    masked = f"{mask_char * len(email_parts[0])}@{email_parts[1]}"
                elif pattern_name in ['phone', 'ssn', 'credit_card']:
                    # Keep last 4 digits
                    masked = f"{mask_char * (len(match.group()) - 4)}{match.group()[-4:]}"
                else:
                    masked = mask_char * len(match.group())
                    
                masked_data = masked_data[:match.start()] + masked + masked_data[match.end():]
        
        return masked_data
        
    except Exception as e:
        logger.error(f"PII masking error: {str(e)}")
        raise EncryptionError("Failed to mask PII", {'error': str(e)})

def rotate_encryption_key() -> bool:
    """
    Manages AWS KMS key rotation with monitoring.
    
    Returns:
        Success status of key rotation
    """
    try:
        kms_client = boto3.client('kms')
        
        # Enable automatic key rotation
        kms_client.enable_key_rotation(KeyId=KMS_KEY_ID)
        
        # Verify rotation status
        response = kms_client.get_key_rotation_status(KeyId=KMS_KEY_ID)
        
        logger.info(
            "KMS key rotation status checked",
            extra={'rotation_enabled': response['KeyRotationEnabled']}
        )
        
        return response['KeyRotationEnabled']
        
    except Exception as e:
        logger.error(f"Key rotation error: {str(e)}")
        raise EncryptionError("Failed to rotate encryption key", {'error': str(e)})

# Export public interface
__all__ = [
    'encrypt_data',
    'decrypt_data',
    'mask_pii',
    'rotate_encryption_key',
    'EncryptionContext'
]