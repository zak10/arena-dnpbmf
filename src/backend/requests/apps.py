"""
Django application configuration for the requests module of the Arena MVP platform.

This module implements:
- Application initialization and configuration
- Security controls for request data
- Request lifecycle management
- Integration with AI processing
- Performance monitoring

Version: 1.0.0
"""

import logging
from django.apps import AppConfig, apps
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

# Configure logging
logger = logging.getLogger(__name__)

# Cache keys
REQUEST_MONITORING_KEY = "request_monitoring"
REQUEST_PROCESSING_KEY = "request_processing"

# Monitoring intervals (in seconds)
MONITORING_INTERVAL = 300  # 5 minutes
CLEANUP_INTERVAL = 3600  # 1 hour

class RequestsConfig(AppConfig):
    """
    Django application configuration class for the requests module.
    
    Implements:
    - Request management initialization
    - Security controls and data classification
    - Request lifecycle monitoring
    - AI integration configuration
    - Performance tracking
    """

    name = 'requests'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Software Evaluation Requests'

    def ready(self):
        """
        Perform application initialization when Django starts.
        
        Initializes:
        - Request data classification
        - Security controls
        - Lifecycle monitoring
        - AI processing settings
        - Performance tracking
        """
        # Import models using lazy loading to avoid circular imports
        from .models import Request, REQUEST_STATUS_CHOICES
        
        # Initialize request data classification settings
        self.init_data_classification()
        
        # Set up request lifecycle monitoring
        self.init_request_monitoring()
        
        # Configure security controls
        self.init_security_controls()
        
        # Initialize AI processing integration
        self.init_ai_processing()
        
        # Set up performance monitoring
        self.init_performance_monitoring()
        
        logger.info("Requests application initialized successfully")

    def init_data_classification(self):
        """Initialize data classification settings for requests."""
        # Set default classification levels based on request state
        self.request_classification = {
            'draft': 'highly_sensitive',
            'submitted': 'highly_sensitive',
            'in_review': 'sensitive',
            'completed': 'sensitive',
            'cancelled': 'sensitive'
        }
        
        # Configure field-level encryption for sensitive data
        self.encrypted_fields = [
            'raw_requirements',
            'parsed_requirements',
            'matching_criteria'
        ]
        
        logger.info("Request data classification initialized")

    def init_request_monitoring(self):
        """Initialize request lifecycle monitoring."""
        # Configure monitoring intervals
        self.monitoring_settings = {
            'active_request_timeout': 24 * 3600,  # 24 hours
            'stale_request_timeout': 7 * 24 * 3600,  # 7 days
            'cleanup_batch_size': 100,
            'monitoring_interval': MONITORING_INTERVAL
        }
        
        # Set up monitoring cache
        cache.set(
            REQUEST_MONITORING_KEY,
            {
                'last_check': timezone.now().isoformat(),
                'active_requests': 0,
                'stale_requests': 0
            },
            timeout=MONITORING_INTERVAL
        )
        
        logger.info("Request lifecycle monitoring initialized")

    def init_security_controls(self):
        """Initialize security controls for request data."""
        # Configure access control settings
        self.security_settings = {
            'require_authentication': True,
            'buyer_only_access': True,
            'staff_override_enabled': True,
            'audit_logging_enabled': True,
            'rate_limiting_enabled': True
        }
        
        # Set up request data retention policies
        self.retention_policies = {
            'active_requests': 365,  # 1 year
            'completed_requests': 730,  # 2 years
            'cancelled_requests': 90   # 90 days
        }
        
        logger.info("Request security controls initialized")

    def init_ai_processing(self):
        """Initialize AI processing integration settings."""
        # Configure AI processing settings
        self.ai_settings = {
            'provider': 'anthropic',
            'model': 'claude-v2',
            'max_processing_time': 5000,  # 5 seconds
            'retry_attempts': 3,
            'batch_size': 10
        }
        
        # Set up processing queue monitoring
        cache.set(
            REQUEST_PROCESSING_KEY,
            {
                'queue_size': 0,
                'processing_time_avg': 0,
                'success_rate': 100
            },
            timeout=MONITORING_INTERVAL
        )
        
        logger.info("AI processing integration initialized")

    def init_performance_monitoring(self):
        """Initialize performance monitoring for requests."""
        # Configure performance thresholds
        self.performance_thresholds = {
            'request_creation_ms': 500,
            'requirement_parsing_ms': 5000,
            'vendor_matching_ms': 2000,
            'proposal_processing_ms': 1000
        }
        
        # Initialize performance metrics
        self.performance_metrics = {
            'request_count': 0,
            'avg_processing_time': 0,
            'error_rate': 0,
            'ai_success_rate': 100
        }
        
        logger.info("Performance monitoring initialized")