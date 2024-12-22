"""
Django application configuration for Arena's real-time WebSocket module.

This module configures:
- WebSocket channel layers and routing
- Performance monitoring with Prometheus
- Connection security and rate limiting
- Error handling and logging

Version: 1.0.0
"""

import logging
from django.apps import AppConfig
from django.conf import settings
from prometheus_client import Counter, Histogram

# Configure logging
logger = logging.getLogger(__name__)

# Prometheus metrics for WebSocket monitoring
WEBSOCKET_METRICS = Counter(
    'websocket_connections_total',
    'Total WebSocket connections',
    ['status', 'user_type']
)

WEBSOCKET_LATENCY = Histogram(
    'websocket_message_latency_seconds',
    'WebSocket message delivery latency',
    ['message_type'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
)

class RealtimeConfig(AppConfig):
    """
    Django application configuration for real-time WebSocket functionality.
    
    Configures:
    - Channel layers for WebSocket communication
    - Performance monitoring and metrics
    - Security middleware and rate limiting
    - Error handling and logging
    """

    # Basic app configuration
    name = 'realtime'
    verbose_name = 'Real-time Communication'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        """
        Initialize realtime application with WebSocket infrastructure.
        
        Configures:
        - Channel layers and routing
        - Prometheus metrics
        - Security middleware
        - Error handling
        """
        try:
            # Import WebSocket components
            from realtime.consumers import ArenaConsumer
            from realtime.routing import websocket_urlpatterns
            from realtime.middleware import WebSocketMiddleware

            # Configure channel layers
            channel_layer_config = {
                'BACKEND': 'channels_redis.core.RedisChannelLayer',
                'CONFIG': {
                    'hosts': [settings.REDIS_URL],
                    'capacity': 1000,  # Max messages in channel
                    'expiry': 60,  # Message expiry in seconds
                }
            }
            setattr(settings, 'CHANNEL_LAYERS', channel_layer_config)

            # Initialize WebSocket URL routing
            from channels.routing import ProtocolTypeRouter, URLRouter
            application = ProtocolTypeRouter({
                'websocket': WebSocketMiddleware(
                    URLRouter(websocket_urlpatterns)
                )
            })
            setattr(settings, 'ASGI_APPLICATION', f'{self.name}.routing.application')

            # Configure rate limiting
            rate_limit_config = {
                'RATE_LIMIT_ENABLED': True,
                'MAX_CONNECTIONS_PER_USER': 5,
                'MESSAGE_RATE_LIMIT': '60/minute',
                'BURST_RATE_LIMIT': '10/second'
            }
            setattr(settings, 'WEBSOCKET_RATE_LIMITS', rate_limit_config)

            # Configure WebSocket authentication
            auth_config = {
                'WEBSOCKET_AUTH_REQUIRED': True,
                'AUTH_TIMEOUT_SECONDS': 30,
                'RECONNECTION_ATTEMPTS': 3
            }
            setattr(settings, 'WEBSOCKET_AUTH', auth_config)

            # Initialize Prometheus metrics
            if settings.MONITORING_ENABLED:
                # Register metrics collectors
                WEBSOCKET_METRICS.labels(status='connected', user_type='buyer')
                WEBSOCKET_METRICS.labels(status='connected', user_type='staff')
                WEBSOCKET_METRICS.labels(status='disconnected', user_type='buyer')
                WEBSOCKET_METRICS.labels(status='disconnected', user_type='staff')
                WEBSOCKET_METRICS.labels(status='error', user_type='buyer')
                WEBSOCKET_METRICS.labels(status='error', user_type='staff')

                # Register latency metrics
                for message_type in ['proposal_update', 'request_update', 'ping']:
                    WEBSOCKET_LATENCY.labels(message_type=message_type)

            # Configure error handling
            from channels.exceptions import WebsocketError
            def websocket_error_handler(exc, context):
                logger.error(
                    f"WebSocket error: {str(exc)}",
                    exc_info=True,
                    extra={
                        'correlation_id': context.get('correlation_id'),
                        'user_id': context.get('user_id'),
                        'connection_id': context.get('connection_id')
                    }
                )
            setattr(settings, 'WEBSOCKET_ERROR_HANDLER', websocket_error_handler)

            # Configure heartbeat mechanism
            heartbeat_config = {
                'HEARTBEAT_INTERVAL': 30,  # Seconds
                'HEARTBEAT_TOLERANCE': 3,   # Missed heartbeats before disconnect
            }
            setattr(settings, 'WEBSOCKET_HEARTBEAT', heartbeat_config)

            logger.info(
                "Realtime application initialized successfully",
                extra={
                    'channel_layer': channel_layer_config['BACKEND'],
                    'rate_limits': rate_limit_config,
                    'monitoring_enabled': settings.MONITORING_ENABLED
                }
            )

        except Exception as e:
            logger.error(
                f"Failed to initialize realtime application: {str(e)}",
                exc_info=True
            )
            raise