"""
Package initializer for the Arena MVP platform's realtime module.

This module provides secure WebSocket functionality for real-time updates with:
- Enhanced security and authentication
- Rate limiting and monitoring
- Connection management
- Performance optimization

Version: 1.0.0
"""

import logging
from typing import List

from realtime.consumers import ArenaConsumer
from realtime.middleware import WebSocketMiddleware
from realtime.routing import websocket_urlpatterns

# Configure logging
logger = logging.getLogger(__name__)

# Package version
VERSION = '1.0.0'

# Configure default Django app
default_app_config = 'realtime.apps.RealtimeConfig'

# Export public interface
__all__: List[str] = [
    'ArenaConsumer',
    'WebSocketMiddleware', 
    'websocket_urlpatterns',
    'VERSION'
]

# Log module initialization
logger.info(
    "Arena realtime module initialized",
    extra={
        'version': VERSION,
        'websocket_patterns': len(websocket_urlpatterns)
    }
)

# Validate critical dependencies
try:
    # Verify consumer implementation
    if not hasattr(ArenaConsumer, 'connect'):
        raise ImportError("ArenaConsumer missing required connect method")
    if not hasattr(ArenaConsumer, 'disconnect'):
        raise ImportError("ArenaConsumer missing required disconnect method")
    if not hasattr(ArenaConsumer, 'receive'):
        raise ImportError("ArenaConsumer missing required receive method")

    # Verify middleware implementation
    if not hasattr(WebSocketMiddleware, 'process_request'):
        raise ImportError("WebSocketMiddleware missing required process_request method")
    if not hasattr(WebSocketMiddleware, 'process_disconnect'): 
        raise ImportError("WebSocketMiddleware missing required process_disconnect method")
    if not hasattr(WebSocketMiddleware, 'authenticate_connection'):
        raise ImportError("WebSocketMiddleware missing required authenticate_connection method")

    # Verify routing configuration
    if not websocket_urlpatterns:
        raise ImportError("No WebSocket URL patterns defined")

    logger.info("Realtime module dependency validation successful")

except ImportError as e:
    logger.error(f"Realtime module initialization failed: {str(e)}")
    raise

except Exception as e:
    logger.error(f"Unexpected error during realtime module initialization: {str(e)}")
    raise