"""
ASGI configuration for Arena MVP platform.

Provides secure HTTP and WebSocket protocol routing with:
- Enhanced security middleware stack
- Real-time updates via WebSocket
- Comprehensive monitoring and metrics
- Rate limiting and connection management

Version: 1.0.0
"""

import os
from django.core.asgi import get_asgi_application  # Django 4.2+
from channels.routing import ProtocolTypeRouter, URLRouter  # Channels 4.0+
from channels.auth import AuthMiddlewareStack  # Channels 4.0+
from channels.security import CORSMiddleware, SecurityMiddleware  # Channels 4.0+

from realtime.routing import websocket_urlpatterns
from realtime.middleware import (
    WebSocketRateLimitMiddleware,
    WebSocketMetricsMiddleware
)

# Configure Django settings module for production
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'arena.settings.production')

# Initialize Django ASGI application
django_asgi_app = get_asgi_application()

# Configure WebSocket middleware stack with security and monitoring
websocket_middleware_stack = (
    # Security middleware
    SecurityMiddleware(
        # CORS protection
        CORSMiddleware(
            # Authentication
            AuthMiddlewareStack(
                # Rate limiting
                WebSocketRateLimitMiddleware(
                    # Metrics collection
                    WebSocketMetricsMiddleware(
                        # URL routing
                        URLRouter(websocket_urlpatterns)
                    )
                )
            )
        )
    )
)

# Configure protocol routing
application = ProtocolTypeRouter({
    # HTTP protocol handler
    "http": django_asgi_app,
    
    # WebSocket protocol handler with middleware stack
    "websocket": websocket_middleware_stack,
})

# Log application initialization
import logging
logger = logging.getLogger(__name__)
logger.info(
    "ASGI application initialized",
    extra={
        "protocols": ["http", "websocket"],
        "middleware": [
            "SecurityMiddleware",
            "CORSMiddleware", 
            "AuthMiddlewareStack",
            "WebSocketRateLimitMiddleware",
            "WebSocketMetricsMiddleware"
        ]
    }
)