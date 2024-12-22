# Django 4.2+ imports
from django.apps import AppConfig  
from django.conf import settings
from django.utils.module_loading import import_string

class NotificationsConfig(AppConfig):
    """
    Django application configuration for the Arena MVP notifications module.
    
    Handles initialization and configuration of:
    - Email notifications via AWS SES
    - Real-time updates via WebSocket channels
    - Notification backends and delivery
    - Rate limiting and error handling
    """
    
    # Basic app configuration
    name = 'notifications'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Notification Services'

    def ready(self):
        """
        Initializes notification services when Django starts.
        
        Sets up:
        - AWS SES email client
        - WebSocket channels
        - Notification backends
        - Error handlers
        - Rate limiting
        - Monitoring
        """
        # Skip initialization during testing to avoid side effects
        if settings.TESTING:
            return

        # Initialize AWS SES for email delivery
        self._init_email_service()
        
        # Set up WebSocket channels for real-time updates
        self._init_channels()
        
        # Load notification backends
        self._init_backends()
        
        # Configure error handling and monitoring
        self._init_error_handling()
        
        # Set up rate limiting
        self._init_rate_limiting()

    def _init_email_service(self):
        """Configure AWS SES email service and template directories."""
        try:
            # Import AWS SES client configuration
            ses_backend = import_string(settings.EMAIL_BACKEND)
            
            # Set up email template directories
            template_dirs = getattr(settings, 'NOTIFICATION_TEMPLATE_DIRS', [])
            if not template_dirs:
                template_dirs = [
                    'notifications/templates/email'
                ]
            settings.NOTIFICATION_TEMPLATE_DIRS = template_dirs
            
            # Register Celery tasks for async email delivery
            from notifications.tasks import send_email_notification
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to initialize email service: {str(e)}")
            raise

    def _init_channels(self):
        """Initialize WebSocket channel layers for real-time notifications."""
        try:
            # Import channel layer configuration
            from channels.layers import get_channel_layer
            
            # Ensure channel layer is properly configured
            channel_layer = get_channel_layer()
            if channel_layer is None:
                raise ValueError("Channel layer not configured")
                
            # Set up channel groups for different notification types
            self.notification_groups = {
                'system': 'system_notifications',
                'user': 'user_notifications',
                'request': 'request_notifications',
                'proposal': 'proposal_notifications'
            }
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to initialize channels: {str(e)}")
            raise

    def _init_backends(self):
        """Load and configure notification delivery backends."""
        try:
            # Import configured backends
            backend_paths = getattr(settings, 'NOTIFICATION_BACKENDS', [])
            self.backends = {}
            
            for backend_path in backend_paths:
                backend_class = import_string(backend_path)
                backend_name = backend_class.__name__.lower()
                self.backends[backend_name] = backend_class()
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to initialize notification backends: {str(e)}")
            raise

    def _init_error_handling(self):
        """Set up error handlers and logging for notification failures."""
        import logging
        
        # Configure notification-specific logger
        self.logger = logging.getLogger('notifications')
        
        # Set up error handlers for different notification types
        self.error_handlers = {
            'email': self._handle_email_error,
            'websocket': self._handle_websocket_error,
            'system': self._handle_system_error
        }

    def _init_rate_limiting(self):
        """Configure rate limiting for notification delivery."""
        # Import rate limiting settings
        rate_limits = getattr(settings, 'NOTIFICATION_RATE_LIMITS', {
            'email': '100/hour',
            'websocket': '1000/minute',
            'system': '500/minute'
        })
        
        # Set up rate limiters
        from django.core.cache import cache
        self.rate_limiters = {
            notification_type: cache
            for notification_type in rate_limits.keys()
        }

    def _handle_email_error(self, error, context):
        """Handle email notification delivery failures."""
        self.logger.error(f"Email notification failed: {str(error)}", extra=context)

    def _handle_websocket_error(self, error, context):
        """Handle WebSocket notification delivery failures."""
        self.logger.error(f"WebSocket notification failed: {str(error)}", extra=context)

    def _handle_system_error(self, error, context):
        """Handle system-level notification failures."""
        self.logger.error(f"System notification failed: {str(error)}", extra=context)