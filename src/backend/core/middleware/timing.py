"""
Timing middleware for the Arena platform that provides microsecond-precision request timing
and comprehensive performance monitoring capabilities.

This middleware tracks request processing time, adds detailed timing headers, and integrates
with the monitoring system through structured logging. It helps ensure system performance
meets target SLAs of <2s page loads and <5s AI processing time.

Version: 1.0.0
"""

import time  # Python 3.11+
import logging  # Python 3.11+
from django.utils.deprecation import MiddlewareMixin  # Django 4.2
from ..constants import PERFORMANCE_THRESHOLDS, HTTP_HEADERS

# Configure module-level logger with structured formatting
logger = logging.getLogger(__name__)

class TimingMiddleware(MiddlewareMixin):
    """
    Django middleware that tracks and measures request processing time with microsecond precision.
    
    Provides:
    - High-precision request timing measurement
    - Performance threshold monitoring
    - Structured logging integration
    - Detailed timing headers with path context
    """

    def __init__(self, get_response=None):
        """
        Initialize the timing middleware with structured logging configuration.
        """
        super().__init__(get_response)
        
        # Ensure logger is configured for structured output
        if not logger.handlers:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler = logging.StreamHandler()
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            logger.setLevel(logging.INFO)

    def _get_time_ms(self) -> float:
        """
        Get current time in milliseconds with microsecond precision.

        Returns:
            float: Current time in milliseconds with microsecond precision
        """
        return time.perf_counter() * 1000

    def process_request(self, request):
        """
        Record the start time of request processing using high-precision timer.

        Args:
            request: The HttpRequest object being processed

        Returns:
            None: Modifies request in place with start time
        """
        request._request_start_time = self._get_time_ms()
        
        logger.info(
            "Request started",
            extra={
                "path": request.path,
                "method": request.method,
                "start_time": request._request_start_time
            }
        )
        
        return None

    def process_response(self, request, response):
        """
        Calculate request duration and add detailed timing header to response.

        Args:
            request: The HttpRequest object being processed
            response: The HttpResponse object to be returned

        Returns:
            HttpResponse: Response with comprehensive timing headers
        """
        if hasattr(request, '_request_start_time'):
            end_time = self._get_time_ms()
            duration = end_time - request._request_start_time
            
            # Add timing header with path context
            response[HTTP_HEADERS['REQUEST_TIME']] = f"{duration:.3f}"
            
            # Log structured timing data
            timing_data = {
                "path": request.path,
                "method": request.method,
                "duration_ms": duration,
                "start_time": request._request_start_time,
                "end_time": end_time
            }
            
            # Check against performance thresholds
            if duration > PERFORMANCE_THRESHOLDS['CRITICAL_TIME_MS']:
                logger.critical(
                    "Request exceeded critical time threshold",
                    extra=timing_data
                )
            elif duration > PERFORMANCE_THRESHOLDS['REQUEST_TIME_MS']:
                logger.warning(
                    "Request exceeded standard time threshold",
                    extra=timing_data
                )
            else:
                logger.info(
                    "Request completed",
                    extra=timing_data
                )

        return response