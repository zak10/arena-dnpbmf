"""
Custom exception classes for the Arena MVP platform.

This module implements a comprehensive error handling system with:
- Standardized error codes and messages
- Secure error reporting capabilities
- Internationalization support
- Efficient error logging
- Stack trace capture in debug mode

Version: 1.0.0
"""

import os
import logging
import traceback
from typing import Dict, Optional, Any
from http import HTTPStatus
from core.constants import ERROR_CODES, ERROR_CODE_RANGES

# Configure logging
logger = logging.getLogger(__name__)

# Global constants
DEFAULT_ERROR_MESSAGE = "An unexpected error occurred"
DEBUG_MODE = bool(os.getenv('DEBUG', False))

class BaseArenaException(Exception):
    """
    Base exception class for all Arena platform exceptions.
    
    Provides enhanced error reporting capabilities including:
    - Standardized error codes
    - HTTP status codes
    - Detailed error information
    - Secure error serialization
    - Optional error logging
    """

    def __init__(
        self,
        message: str = DEFAULT_ERROR_MESSAGE,
        code: str = ERROR_CODE_RANGES["SYSTEM"]["DATABASE_ERROR"],
        status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
        log_error: bool = True
    ) -> None:
        """
        Initialize the base exception with comprehensive error details.

        Args:
            message: Human-readable error description
            code: Standardized error code from ERROR_CODE_RANGES
            status_code: HTTP status code for API responses
            details: Additional error context and data
            log_error: Whether to log the error automatically
        """
        super().__init__(message)
        
        # Sanitize and validate inputs
        self.message = str(message).strip()
        self.code = self._validate_error_code(code)
        self.status_code = int(status_code)
        self.details = self._sanitize_details(details or {})
        
        # Capture stack trace in debug mode
        self.stack_trace = None
        if DEBUG_MODE:
            self.stack_trace = traceback.format_exc()
        
        # Log error if requested
        if log_error:
            self.log_error()

    def _validate_error_code(self, code: str) -> str:
        """
        Validate that the error code follows the standardized format.

        Args:
            code: Error code to validate

        Returns:
            Validated error code

        Raises:
            ValueError: If error code format is invalid
        """
        if not code or not isinstance(code, str):
            return ERROR_CODE_RANGES["SYSTEM"]["DATABASE_ERROR"]
            
        # Verify code format (Exxxx)
        if not (code.startswith('E') and len(code) == 5 and code[1:].isdigit()):
            return ERROR_CODE_RANGES["SYSTEM"]["DATABASE_ERROR"]
            
        return code

    def _sanitize_details(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize error details to remove sensitive information.

        Args:
            details: Raw error details dictionary

        Returns:
            Sanitized error details
        """
        if not isinstance(details, dict):
            return {}
            
        # Remove sensitive keys
        sensitive_keys = {'password', 'token', 'secret', 'key', 'auth'}
        return {
            k: '[REDACTED]' if any(s in k.lower() for s in sensitive_keys) else v
            for k, v in details.items()
        }

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to a dictionary format suitable for API responses.

        Returns:
            Dictionary containing error details
        """
        error_dict = {
            'code': self.code,
            'message': self.message,
            'status': self.status_code
        }

        # Include sanitized details if present
        if self.details:
            error_dict['details'] = self.details

        # Include stack trace in debug mode
        if DEBUG_MODE and self.stack_trace:
            error_dict['stack_trace'] = self.stack_trace

        return error_dict

    def log_error(self) -> None:
        """
        Log error details securely with appropriate redaction.
        """
        log_message = (
            f"Error {self.code}: {self.message} "
            f"[Status: {self.status_code}]"
        )
        
        # Add sanitized details if present
        if self.details:
            log_message += f" Details: {self.details}"
            
        # Add stack trace in debug mode
        if DEBUG_MODE and self.stack_trace:
            log_message += f"\nStack trace:\n{self.stack_trace}"

        # Log at appropriate level based on status code
        if self.status_code >= 500:
            logger.error(log_message)
        else:
            logger.warning(log_message)

class AuthenticationError(BaseArenaException):
    """Exception class for authentication-related errors."""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        code: str = ERROR_CODE_RANGES["AUTHENTICATION"]["INVALID_CREDENTIALS"],
        details: Optional[Dict[str, Any]] = None,
        status_code: int = HTTPStatus.UNAUTHORIZED
    ) -> None:
        super().__init__(message, code, status_code, details)

class RequestError(BaseArenaException):
    """Exception class for request-related errors."""
    
    def __init__(
        self,
        message: str = "Invalid request",
        code: str = ERROR_CODE_RANGES["REQUEST"]["INVALID_FORMAT"],
        details: Optional[Dict[str, Any]] = None,
        status_code: int = HTTPStatus.BAD_REQUEST
    ) -> None:
        super().__init__(message, code, status_code, details)

class ProposalError(BaseArenaException):
    """Exception class for proposal-related errors."""
    
    def __init__(
        self,
        message: str = "Invalid proposal",
        code: str = ERROR_CODE_RANGES["PROPOSAL"]["INVALID_STATUS"],
        details: Optional[Dict[str, Any]] = None,
        status_code: int = HTTPStatus.BAD_REQUEST
    ) -> None:
        super().__init__(message, code, status_code, details)

class SystemError(BaseArenaException):
    """Exception class for system-level errors."""
    
    def __init__(
        self,
        message: str = "System error occurred",
        code: str = ERROR_CODE_RANGES["SYSTEM"]["SERVICE_UNAVAILABLE"],
        details: Optional[Dict[str, Any]] = None,
        status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR
    ) -> None:
        super().__init__(message, code, status_code, details)

# Export all exception classes
__all__ = [
    'BaseArenaException',
    'AuthenticationError',
    'RequestError',
    'ProposalError',
    'SystemError'
]