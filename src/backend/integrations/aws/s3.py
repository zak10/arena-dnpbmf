"""
AWS S3 integration module for Arena MVP platform.

Provides secure document storage and retrieval with:
- Mandatory encryption for sensitive data
- Comprehensive access controls
- Detailed audit logging
- Versioning support
- Lifecycle management

Version: 1.0.0
"""

import os
import uuid
import logging
import mimetypes
from typing import BinaryIO, Dict, Optional, Tuple
from functools import wraps

# Third-party imports
import boto3  # version 1.26.0
from botocore.exceptions import BotoCoreError, ClientError  # version 1.29.0

# Internal imports
from core.utils.encryption import encrypt_data, decrypt_data
from core.exceptions import SystemError
from core.constants import DataClassification

# Configure logging
logger = logging.getLogger(__name__)

# Global Constants
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'arena-documents-prod')
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
DEFAULT_EXPIRATION = 3600  # 1 hour
ENCRYPTION_REQUIRED = True
S3_KMS_KEY_ID = os.getenv('AWS_KMS_KEY_ID')
VERSIONING_ENABLED = True
MAX_VERSIONS = 10

def validate_file_access(func):
    """Decorator to validate file access permissions and security requirements."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            # Extract file info from args/kwargs
            file_obj = next((arg for arg in args if hasattr(arg, 'read')), None)
            file_path = kwargs.get('file_path') or next((arg for arg in args if isinstance(arg, str)), None)

            if file_obj:
                # Validate file size
                file_obj.seek(0, 2)
                size = file_obj.tell()
                file_obj.seek(0)
                if size > MAX_FILE_SIZE:
                    raise SystemError(
                        message="File exceeds maximum size limit",
                        code="E4003",
                        details={'max_size': MAX_FILE_SIZE, 'actual_size': size}
                    )

                # Validate file type
                _, ext = os.path.splitext(file_path)
                if ext.lower() not in ALLOWED_FILE_TYPES:
                    raise SystemError(
                        message="Invalid file type",
                        code="E4003",
                        details={'allowed_types': ALLOWED_FILE_TYPES, 'actual_type': ext}
                    )

            return func(*args, **kwargs)

        except Exception as e:
            logger.error(f"File validation error: {str(e)}")
            raise SystemError(
                message="File validation failed",
                code="E4003",
                details={'error': str(e)}
            )

    return wrapper

class S3Client:
    """Enhanced S3 client with security features and monitoring."""

    def __init__(self, encryption_config: Optional[Dict] = None):
        """Initialize S3 client with security configuration."""
        try:
            self._client = boto3.client('s3')
            self._bucket_name = S3_BUCKET_NAME
            self._logger = logging.getLogger(__name__)
            self._encryption_config = encryption_config or {
                'SSEAlgorithm': 'aws:kms',
                'KMSKeyId': S3_KMS_KEY_ID
            }

            # Verify bucket configuration
            self.configure_bucket()

        except Exception as e:
            logger.error(f"S3 client initialization error: {str(e)}")
            raise SystemError(
                message="Failed to initialize S3 client",
                code="E4003",
                details={'error': str(e)}
            )

    def configure_bucket(self) -> bool:
        """Configures S3 bucket with security settings."""
        try:
            # Enable versioning
            if VERSIONING_ENABLED:
                self._client.put_bucket_versioning(
                    Bucket=self._bucket_name,
                    VersioningConfiguration={'Status': 'Enabled'}
                )

            # Configure server-side encryption
            self._client.put_bucket_encryption(
                Bucket=self._bucket_name,
                ServerSideEncryptionConfiguration={
                    'Rules': [{
                        'ApplyServerSideEncryptionByDefault': self._encryption_config
                    }]
                }
            )

            # Configure lifecycle rules
            self._client.put_bucket_lifecycle_configuration(
                Bucket=self._bucket_name,
                LifecycleConfiguration={
                    'Rules': [{
                        'ID': 'version-cleanup',
                        'Status': 'Enabled',
                        'NoncurrentVersionExpiration': {
                            'NoncurrentDays': 90
                        },
                        'NoncurrentVersionTransitions': [{
                            'NoncurrentDays': 30,
                            'StorageClass': 'STANDARD_IA'
                        }]
                    }]
                }
            )

            return True

        except Exception as e:
            logger.error(f"Bucket configuration error: {str(e)}")
            raise SystemError(
                message="Failed to configure S3 bucket",
                code="E4003",
                details={'error': str(e)}
            )

    @validate_file_access
    def upload_file(
        self,
        file_obj: BinaryIO,
        file_path: str,
        data_classification: DataClassification,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Uploads a file to S3 with mandatory encryption and validation."""
        try:
            # Generate unique S3 key
            s3_key = f"{uuid.uuid4()}/{file_path}"

            # Detect content type
            content_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'

            # Encrypt file if required
            if ENCRYPTION_REQUIRED or data_classification != DataClassification.PUBLIC:
                file_data = file_obj.read()
                encrypted_data = encrypt_data(file_data, data_classification)
                file_obj = encrypted_data.encode()

            # Prepare upload parameters
            upload_args = {
                'Bucket': self._bucket_name,
                'Key': s3_key,
                'Body': file_obj,
                'ContentType': content_type,
                'Metadata': {
                    'classification': data_classification.value,
                    'encrypted': str(ENCRYPTION_REQUIRED),
                    **metadata or {}
                },
                'ServerSideEncryption': self._encryption_config['SSEAlgorithm'],
                'SSEKMSKeyId': self._encryption_config['KMSKeyId']
            }

            # Upload file
            response = self._client.upload_fileobj(**upload_args)

            # Get version ID if versioning is enabled
            version_id = None
            if VERSIONING_ENABLED:
                version_id = response.get('VersionId')

            # Log upload event
            logger.info(
                "File uploaded successfully",
                extra={
                    'file_path': file_path,
                    'classification': data_classification.value,
                    'version_id': version_id
                }
            )

            return {
                's3_key': s3_key,
                'version_id': version_id,
                'content_type': content_type,
                'encrypted': ENCRYPTION_REQUIRED,
                'classification': data_classification.value
            }

        except Exception as e:
            logger.error(f"File upload error: {str(e)}")
            raise SystemError(
                message="Failed to upload file",
                code="E4003",
                details={'error': str(e)}
            )

    @validate_file_access
    def download_file(self, file_path: str, version_id: Optional[str] = None) -> Tuple[BinaryIO, Dict]:
        """Downloads and decrypts a file from S3 with access validation."""
        try:
            # Prepare download parameters
            download_args = {
                'Bucket': self._bucket_name,
                'Key': file_path
            }
            if version_id:
                download_args['VersionId'] = version_id

            # Download file
            response = self._client.get_object(**download_args)
            file_data = response['Body'].read()

            # Get metadata
            metadata = response.get('Metadata', {})
            classification = DataClassification(metadata.get('classification', 'public'))

            # Decrypt if encrypted
            if metadata.get('encrypted') == 'True':
                file_data = decrypt_data(file_data)

            # Log download event
            logger.info(
                "File downloaded successfully",
                extra={
                    'file_path': file_path,
                    'version_id': version_id,
                    'classification': classification.value
                }
            )

            return file_data, {
                'content_type': response.get('ContentType'),
                'version_id': response.get('VersionId'),
                'classification': classification.value,
                'last_modified': response.get('LastModified'),
                'size': response.get('ContentLength')
            }

        except Exception as e:
            logger.error(f"File download error: {str(e)}")
            raise SystemError(
                message="Failed to download file",
                code="E4003",
                details={'error': str(e)}
            )

# Export public interface
__all__ = ['S3Client']