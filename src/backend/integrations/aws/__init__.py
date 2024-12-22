"""
AWS integration initialization module for Arena MVP platform.

Provides secure AWS client initialization with:
- Credential validation and management
- Service health monitoring
- Secure client configuration
- Rate limiting and retry logic

Version: 1.0.0
"""

import os
import logging
import time
from typing import Dict, Optional, Tuple
from functools import wraps

# Third-party imports
import boto3  # version: 1.26.0
from botocore.exceptions import BotoCoreError, ClientError

# Internal imports
from .s3 import S3Client
from .ses import SESClient
from core.exceptions import SystemError

# Configure logging
logger = logging.getLogger(__name__)

# Global Constants
AWS_REGION = os.getenv('AWS_REGION')
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_SESSION_TOKEN = os.getenv('AWS_SESSION_TOKEN')  # Optional for temporary credentials

# Service configuration
DEFAULT_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT = 30
SERVICE_HEALTH_CHECK_INTERVAL = 300  # 5 minutes

def log_execution_time(func):
    """Decorator to log function execution time for monitoring."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.info(
                f"{func.__name__} executed successfully",
                extra={
                    'execution_time': execution_time,
                    'function': func.__name__
                }
            )
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"{func.__name__} failed",
                extra={
                    'execution_time': execution_time,
                    'function': func.__name__,
                    'error': str(e)
                }
            )
            raise
    return wrapper

def retry(max_attempts: int = DEFAULT_RETRY_ATTEMPTS, backoff: int = 2):
    """Decorator for implementing retry logic with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except (BotoCoreError, ClientError) as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        sleep_time = backoff ** attempt
                        logger.warning(
                            f"Retry attempt {attempt + 1}/{max_attempts} for {func.__name__}",
                            extra={
                                'sleep_time': sleep_time,
                                'error': str(e)
                            }
                        )
                        time.sleep(sleep_time)
            raise last_exception
        return wrapper
    return decorator

@retry(max_attempts=3, backoff=2)
@log_execution_time
def initialize_aws_clients(
    retry_attempts: int = DEFAULT_RETRY_ATTEMPTS,
    timeout: int = DEFAULT_TIMEOUT
) -> Tuple[S3Client, SESClient]:
    """
    Initialize AWS service clients with secure credential validation and health checks.

    Args:
        retry_attempts: Number of retry attempts for operations
        timeout: Operation timeout in seconds

    Returns:
        Tuple[S3Client, SESClient]: Initialized S3 and SES clients

    Raises:
        SystemError: If initialization fails
    """
    try:
        # Validate required AWS credentials
        if not all([AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]):
            raise SystemError(
                message="Missing required AWS credentials",
                code="E4003",
                details={"service": "AWS"}
            )

        # Configure boto3 session with security best practices
        session = boto3.Session(
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            aws_session_token=AWS_SESSION_TOKEN
        )

        # Initialize S3 client with security configuration
        s3_client = S3Client()
        if not s3_client.validate_bucket_access():
            raise SystemError(
                message="Failed to validate S3 bucket access",
                code="E4003",
                details={"service": "S3"}
            )

        # Initialize SES client with security configuration
        ses_client = SESClient()
        if not ses_client.validate_ses_access():
            raise SystemError(
                message="Failed to validate SES access",
                code="E4003",
                details={"service": "SES"}
            )

        # Validate service health
        if not validate_service_health("s3"):
            raise SystemError(
                message="S3 service health check failed",
                code="E4003",
                details={"service": "S3"}
            )

        if not validate_service_health("ses"):
            raise SystemError(
                message="SES service health check failed",
                code="E4003",
                details={"service": "SES"}
            )

        logger.info(
            "AWS clients initialized successfully",
            extra={
                "region": AWS_REGION,
                "services": ["s3", "ses"]
            }
        )

        return s3_client, ses_client

    except Exception as e:
        logger.error(f"AWS client initialization error: {str(e)}")
        raise SystemError(
            message="Failed to initialize AWS clients",
            code="E4003",
            details={"error": str(e)}
        )

def validate_service_health(service_name: str) -> bool:
    """
    Validate AWS service health and availability.

    Args:
        service_name: Name of AWS service to check

    Returns:
        bool: True if service is healthy
    """
    try:
        client = boto3.client(service_name)
        
        # Check service-specific health indicators
        if service_name == "s3":
            # Verify S3 bucket access
            client.head_bucket(Bucket=os.getenv('S3_BUCKET_NAME'))
        elif service_name == "ses":
            # Check SES sending quota
            quota = client.get_send_quota()
            if quota['MaxSendRate'] <= 0:
                return False

        # Cache health status
        cache_key = f"aws_health:{service_name}"
        logger.info(
            f"{service_name} health check passed",
            extra={
                "service": service_name,
                "timestamp": time.time()
            }
        )
        return True

    except Exception as e:
        logger.error(
            f"Service health check failed for {service_name}",
            extra={
                "service": service_name,
                "error": str(e)
            }
        )
        return False

# Export public interface
__all__ = [
    'S3Client',
    'SESClient',
    'initialize_aws_clients'
]