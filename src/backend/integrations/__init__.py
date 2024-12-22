"""
Main entry point for external service integrations in the Arena MVP platform.

Provides centralized access to:
- Anthropic AI for requirement parsing
- AWS S3 for secure document storage
- AWS SES for email communications

Features:
- Comprehensive security controls
- Performance monitoring
- Error handling
- Logging standardization

Version: 1.0.0
"""

import logging
from typing import Optional

# Internal imports with version tracking
from integrations.anthropic.client import AnthropicClient  # version: 1.0.0
from integrations.aws.s3 import S3Client  # version: 1.0.0
from integrations.aws.ses import SESClient  # version: 1.0.0

# Version information for integration package
VERSION = "1.0.0"

# Configure module logger
logger = logging.getLogger(__name__)

def setup_logging(log_level: str = "INFO") -> None:
    """
    Configure logging for integration services with standardized formatting.

    Args:
        log_level: Desired logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Create formatter for consistent log format
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Configure console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    # Configure file handler for persistent logs
    file_handler = logging.FileHandler('integrations.log')
    file_handler.setFormatter(formatter)

    # Set up root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Log initialization
    logger.info(
        "Integration logging configured",
        extra={
            "version": VERSION,
            "log_level": log_level
        }
    )

# Initialize logging with default level
setup_logging()

# Export public interface
__all__ = [
    "AnthropicClient",
    "S3Client", 
    "SESClient",
    "VERSION",
    "setup_logging"
]