"""
Custom exception classes for handling Anthropic Claude AI integration errors.

This module provides specialized exception classes for:
- API communication errors
- Processing timeouts
- Requirement parsing failures
- Enhanced error tracking and monitoring

Version: 1.0.0
"""

from http import HTTPStatus
from datetime import datetime
from typing import Dict, List, Optional, Any

from core.exceptions import BaseArenaException

# Global constants
ANTHROPIC_ERROR_PREFIX = "E4001"  # System/AI Processing error range
DEFAULT_ANTHROPIC_ERROR_MESSAGE = "An error occurred while processing the AI request"
TIMEOUT_ERROR_MESSAGE = "AI processing exceeded the maximum allowed time of {timeout} seconds"
MAX_PROCESSING_TIME = 5.0  # Maximum allowed processing time in seconds

class AnthropicError(BaseArenaException):
    """
    Base exception class for Anthropic integration errors with enhanced context tracking.
    
    Provides additional context specific to AI processing including:
    - Service identification
    - Detailed error context
    - Timing information
    """

    def __init__(
        self,
        message: str = DEFAULT_ANTHROPIC_ERROR_MESSAGE,
        service: str = "general",
        details: Optional[Dict[str, Any]] = None,
        status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR
    ) -> None:
        """
        Initialize Anthropic error with comprehensive error context.

        Args:
            message: Human-readable error description
            service: Specific service/component where error occurred
            details: Additional error context and data
            status_code: HTTP status code for API responses
        """
        super().__init__(
            message=message,
            code=ANTHROPIC_ERROR_PREFIX,
            status_code=status_code,
            details=details
        )
        
        self.service = service
        self.details = details or {}
        self.timestamp = datetime.utcnow().isoformat()

class AnthropicAPIError(AnthropicError):
    """
    Exception for Anthropic API communication errors with detailed response tracking.
    
    Captures comprehensive API response context including:
    - HTTP status codes
    - Response payloads
    - Request identifiers
    - Rate limit information
    """

    def __init__(
        self,
        message: str,
        status_code: int,
        response_data: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ) -> None:
        """
        Initialize API error with comprehensive response context.

        Args:
            message: Error message from API response
            status_code: HTTP status code from API
            response_data: Raw API response data
            request_id: Unique identifier for API request
        """
        details = {
            "request_id": request_id,
            "response_data": self._sanitize_response_data(response_data or {}),
            "endpoint": response_data.get("endpoint") if response_data else None,
            "method": response_data.get("method") if response_data else None
        }

        # Add rate limit information if present
        if response_data and "rate_limit" in response_data:
            details["rate_limit"] = response_data["rate_limit"]

        super().__init__(
            message=message,
            service="api",
            details=details,
            status_code=status_code
        )

        self.status_code = status_code
        self.response_data = self._sanitize_response_data(response_data or {})
        self.request_id = request_id

    def _sanitize_response_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive information from API response data."""
        sensitive_keys = {"api_key", "token", "secret"}
        return {
            k: "[REDACTED]" if k in sensitive_keys else v
            for k, v in data.items()
        }

class AnthropicTimeoutError(AnthropicError):
    """
    Exception for Anthropic API timeout errors with duration tracking.
    
    Tracks detailed timing information including:
    - Timeout threshold
    - Actual operation duration
    - Operation type
    - Duration overage
    """

    def __init__(
        self,
        timeout: float,
        actual_duration: float,
        operation_type: str
    ) -> None:
        """
        Initialize timeout error with detailed timing information.

        Args:
            timeout: Maximum allowed time in seconds
            actual_duration: Actual operation duration in seconds
            operation_type: Type of operation that timed out
        """
        message = TIMEOUT_ERROR_MESSAGE.format(timeout=timeout)
        details = {
            "timeout_threshold": timeout,
            "actual_duration": actual_duration,
            "operation_type": operation_type,
            "duration_overage": actual_duration - timeout
        }

        super().__init__(
            message=message,
            service="timeout",
            details=details,
            status_code=HTTPStatus.REQUEST_TIMEOUT
        )

        self.timeout = timeout
        self.actual_duration = actual_duration
        self.operation_type = operation_type

class AnthropicParseError(AnthropicError):
    """
    Exception for requirement parsing errors with detailed failure context.
    
    Tracks parsing failure information including:
    - Failed sections
    - Parsing attempt details
    - Duration metrics
    """

    def __init__(
        self,
        message: str,
        parsing_details: Dict[str, Any],
        failed_sections: List[str]
    ) -> None:
        """
        Initialize parsing error with comprehensive failure information.

        Args:
            message: Description of parsing failure
            parsing_details: Details about the parsing attempt
            failed_sections: List of sections that failed to parse
        """
        details = {
            "parsing_details": self._sanitize_parsing_details(parsing_details),
            "failed_sections": failed_sections,
            "attempt_count": parsing_details.get("attempt_count", 1),
            "duration_ms": parsing_details.get("duration_ms")
        }

        super().__init__(
            message=message,
            service="parsing",
            details=details,
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY
        )

        self.parsing_details = self._sanitize_parsing_details(parsing_details)
        self.failed_sections = failed_sections
        self.attempt_count = parsing_details.get("attempt_count", 1)

    def _sanitize_parsing_details(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive information from parsing details."""
        if not isinstance(details, dict):
            return {}
            
        # Remove raw input to prevent sensitive data exposure
        sanitized = details.copy()
        sanitized.pop("raw_input", None)
        return sanitized

__all__ = [
    'AnthropicError',
    'AnthropicAPIError',
    'AnthropicTimeoutError',
    'AnthropicParseError'
]