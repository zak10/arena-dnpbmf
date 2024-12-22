"""
WebSocket routing configuration for Arena real-time update system.

Implements:
- Secure WebSocket endpoints with authentication
- Rate limiting and monitoring
- Correlation tracking
- Enhanced middleware stack
- Performance optimization

Version: 1.0.0
"""

import logging
from typing import List

from channels.routing import URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import re_path
from prometheus_client import Counter, Histogram

from realtime.consumers import ArenaConsumer
from realtime.middleware import (
    WebSocketMiddleware,
    CorrelationMiddleware,
    RateLimitMiddleware
)

# Configure logging
logger = logging.getLogger(__name__)

# Prometheus metrics
websocket_connections = Counter(
    'arena_websocket_connections_total',
    'Total WebSocket connections',
    ['status']
)
websocket_latency = Histogram(
    'arena_websocket_latency_seconds',
    'WebSocket message latency',
    ['message_type'],
    buckets=[0.1, 0.5, 1.0, 2.0]
)

# Rate limiting configuration
RATE_LIMIT_CONFIG = {
    "per_user": 100,  # Max 100 messages per user
    "per_ip": 200,    # Max 200 messages per IP
    "window_seconds": 60  # Per minute window
}

# Monitoring configuration
MONITORING_CONFIG = {
    "enable_metrics": True,
    "latency_buckets": [0.1, 0.5, 1.0, 2.0]
}

def get_middleware_stack() -> AuthMiddlewareStack:
    """
    Construct the complete middleware stack for WebSocket routing.
    
    Returns:
        AuthMiddlewareStack: Configured middleware stack with auth, rate limiting,
                           correlation tracking, and monitoring
    """
    # Start with base authentication middleware
    middleware_stack = AuthMiddlewareStack

    # Add rate limiting with configuration
    middleware_stack = RateLimitMiddleware(
        middleware_stack,
        per_user=RATE_LIMIT_CONFIG["per_user"],
        per_ip=RATE_LIMIT_CONFIG["per_ip"],
        window_seconds=RATE_LIMIT_CONFIG["window_seconds"]
    )

    # Add correlation tracking
    middleware_stack = CorrelationMiddleware(middleware_stack)

    # Add WebSocket security and monitoring
    middleware_stack = WebSocketMiddleware(
        middleware_stack,
        metrics_enabled=MONITORING_CONFIG["enable_metrics"],
        latency_buckets=MONITORING_CONFIG["latency_buckets"]
    )

    return middleware_stack

# Define WebSocket URL patterns
websocket_urlpatterns: List = [
    re_path(
        r"ws/updates/(?P<request_id>[0-9a-f-]+)/$",
        ArenaConsumer.as_asgi(),
        name="request_updates"
    ),
    re_path(
        r"ws/proposals/(?P<proposal_id>[0-9a-f-]+)/$",
        ArenaConsumer.as_asgi(),
        name="proposal_updates"
    )
]

# Configure the application with middleware stack and routing
application = URLRouter([
    # Wrap URL patterns with middleware stack
    get_middleware_stack()(
        URLRouter(websocket_urlpatterns)
    )
])

# Log routing configuration
logger.info(
    "WebSocket routing configured",
    extra={
        "url_patterns": len(websocket_urlpatterns),
        "rate_limits": RATE_LIMIT_CONFIG,
        "monitoring": MONITORING_CONFIG
    }
)

# Export routing configuration
__all__ = [
    'websocket_urlpatterns',
    'application',
    'RATE_LIMIT_CONFIG',
    'MONITORING_CONFIG'
]