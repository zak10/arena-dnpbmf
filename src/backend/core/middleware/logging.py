"""
Logging middleware for the Arena platform that provides structured request/response logging
with performance metrics, correlation IDs, and security audit trails.

This middleware implements comprehensive logging for:
- Security monitoring and audit trails
- Performance tracking against defined thresholds
- Request tracing with correlation IDs
- Distributed system observability

Version: 1.0.0
"""

import logging
import time
import json
import uuid
from typing import Dict, Any, Optional
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpRequest, HttpResponse

from ..constants import (
    PERFORMANCE_THRESHOLDS,
    HTTP_HEADERS,
)

# Configure module logger
logger = logging.getLogger(__name__)

class LoggingMiddleware(MiddlewareMixin):
    """
    Django middleware that provides comprehensive structured logging for all HTTP requests
    and responses with security audit trails, performance metrics, and request tracing.
    """

    def __init__(self, get_response=None):
        """Initialize the logging middleware with configured logger and format version."""
        super().__init__(get_response)
        self.logger = logger
        self.log_format_version = "1.0"
        
        # Ensure logger is configured for structured output
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def process_request(self, request: HttpRequest) -> None:
        """
        Process and log incoming request details with security context and timing.
        
        Args:
            request: The incoming HttpRequest object
            
        Returns:
            None - Modifies request object in place
        """
        try:
            # Generate or extract correlation ID
            correlation_id = request.headers.get(
                HTTP_HEADERS['CORRELATION_ID'],
                str(uuid.uuid4())
            )
            
            # Record request start time with high precision
            request.start_time = time.perf_counter()
            
            # Extract request metadata
            request_data = {
                'method': request.method,
                'path': request.path,
                'query_params': self._mask_sensitive_data(dict(request.GET)),
                'headers': self._mask_sensitive_data(dict(request.headers)),
                'content_length': len(request.body) if request.body else 0,
                'content_type': request.content_type,
                'client_ip': self._get_client_ip(request),
                'user_agent': request.headers.get('User-Agent', ''),
            }

            # Add authentication context if available
            if hasattr(request, 'user') and request.user.is_authenticated:
                request_data['user_id'] = str(request.user.id)
                request_data['user_type'] = 'staff' if request.user.is_staff else 'buyer'

            # Build and log structured request data
            log_data = self._build_log_data(
                metadata=request_data,
                correlation_id=correlation_id,
                log_type='request',
                environment=self._get_environment()
            )
            
            self.logger.info(json.dumps(log_data))
            
            # Store context for response logging
            request.correlation_id = correlation_id
            
        except Exception as e:
            self.logger.error(f"Error logging request: {str(e)}", exc_info=True)

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Process and log response details with performance metrics.
        
        Args:
            request: The HttpRequest object
            response: The HttpResponse object
            
        Returns:
            HttpResponse: The unmodified response
        """
        try:
            # Calculate request duration
            duration = None
            if hasattr(request, 'start_time'):
                duration = (time.perf_counter() - request.start_time) * 1000  # Convert to ms

            # Extract response metadata
            response_data = {
                'status_code': response.status_code,
                'content_length': len(response.content) if response.content else 0,
                'headers': self._mask_sensitive_data(dict(response.headers)),
                'duration_ms': duration,
            }

            # Add performance categorization
            if duration is not None:
                response_data['performance_category'] = self._categorize_performance(duration)

            # Build and log structured response data
            log_data = self._build_log_data(
                metadata=response_data,
                correlation_id=getattr(request, 'correlation_id', None),
                log_type='response',
                environment=self._get_environment()
            )

            # Log at appropriate level based on performance/status
            if duration and duration > PERFORMANCE_THRESHOLDS['REQUEST_TIME_CRITICAL']:
                self.logger.warning(json.dumps(log_data))
            elif response.status_code >= 400:
                self.logger.error(json.dumps(log_data))
            else:
                self.logger.info(json.dumps(log_data))

        except Exception as e:
            self.logger.error(f"Error logging response: {str(e)}", exc_info=True)

        return response

    def _build_log_data(self, metadata: Dict[str, Any], correlation_id: str,
                       log_type: str, environment: str) -> Dict[str, Any]:
        """
        Build comprehensive structured log data dictionary.
        
        Args:
            metadata: Dictionary of log metadata
            correlation_id: Request correlation ID
            log_type: Type of log entry (request/response)
            environment: Deployment environment
            
        Returns:
            Dict containing structured log data
        """
        return {
            'version': self.log_format_version,
            'timestamp': time.time(),
            'correlation_id': correlation_id,
            'log_type': log_type,
            'environment': environment,
            'metadata': metadata
        }

    def _mask_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mask sensitive data in logs (passwords, tokens, etc).
        
        Args:
            data: Dictionary potentially containing sensitive data
            
        Returns:
            Dict with sensitive values masked
        """
        sensitive_fields = {
            'password', 'token', 'secret', 'key', 'authorization',
            'session', 'cookie', 'csrf'
        }
        
        masked_data = {}
        for key, value in data.items():
            if any(field in key.lower() for field in sensitive_fields):
                masked_data[key] = '***MASKED***'
            else:
                masked_data[key] = value
        return masked_data

    def _get_client_ip(self, request: HttpRequest) -> str:
        """
        Extract client IP with proxy handling.
        
        Args:
            request: The HttpRequest object
            
        Returns:
            str: Client IP address
        """
        x_forwarded_for = request.headers.get(HTTP_HEADERS['FORWARDED_FOR'])
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')

    def _categorize_performance(self, duration: float) -> str:
        """
        Categorize request performance based on duration.
        
        Args:
            duration: Request duration in milliseconds
            
        Returns:
            str: Performance category
        """
        if duration <= PERFORMANCE_THRESHOLDS['REQUEST_TIME_MS']:
            return 'good'
        elif duration <= PERFORMANCE_THRESHOLDS['CRITICAL_TIME_MS']:
            return 'warning'
        return 'critical'

    def _get_environment(self) -> str:
        """
        Get current deployment environment.
        
        Returns:
            str: Environment name
        """
        # This should be configured via environment variable in production
        return 'development'