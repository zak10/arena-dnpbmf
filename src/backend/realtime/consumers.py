"""
WebSocket consumer implementation for Arena MVP platform.

Provides real-time updates with:
- Enhanced security and authentication
- Connection monitoring and rate limiting
- Performance optimization
- Comprehensive error handling
- Audit logging

Version: 1.0.0
"""

import logging
import json
import uuid
from typing import Dict, Optional, Any
from functools import wraps

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import async_to_sync
from ratelimit import RateLimiter

from realtime.middleware import WebSocketMiddleware
from proposals.services import ProposalService
from core.exceptions import SystemError
from core.constants import PERFORMANCE_THRESHOLDS

# Configure logging
logger = logging.getLogger(__name__)

# Global constants
PROPOSAL_GROUP = "proposal_updates_{}"
REQUEST_GROUP = "request_updates_{}"
MAX_CONNECTIONS_PER_USER = 5
MESSAGE_RATE_LIMIT = "60/minute"
RECONNECTION_TIMEOUT = 30

def validate_message(func):
    """Decorator to validate incoming WebSocket messages."""
    @wraps(func)
    async def wrapper(self, content, *args, **kwargs):
        try:
            # Validate message format
            if not isinstance(content, dict):
                raise ValueError("Invalid message format")

            # Validate required fields
            required_fields = ["type", "data"]
            if not all(field in content for field in required_fields):
                raise ValueError("Missing required fields")

            # Validate message type
            valid_types = ["proposal_update", "request_update", "ping"]
            if content["type"] not in valid_types:
                raise ValueError(f"Invalid message type: {content['type']}")

            return await func(self, content, *args, **kwargs)

        except Exception as e:
            await self.handle_error(
                "message_validation_error",
                str(e),
                {"content": content}
            )

    return wrapper

class ArenaConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for handling real-time updates with enhanced security and monitoring.
    
    Features:
    - Secure connection management
    - Rate limiting and validation
    - Performance monitoring
    - Error handling and recovery
    - Audit logging
    """

    def __init__(self, *args, **kwargs):
        """Initialize consumer with security and monitoring configuration."""
        super().__init__(*args, **kwargs)
        self.groups = set()
        self.proposal_service = ProposalService()
        self.connection_metadata = {}
        self.rate_limiter = RateLimiter(MESSAGE_RATE_LIMIT)

    async def connect(self):
        """
        Handle incoming WebSocket connection with security validation.
        
        Validates:
        - User authentication
        - Connection limits
        - Rate limiting
        """
        try:
            # Get user from scope
            if not self.scope.get("user") or not self.scope["user"].is_authenticated:
                await self.close(code=4001)
                return

            user = self.scope["user"]
            user_id = str(user.id)

            # Check connection limit
            active_connections = len(WebSocketMiddleware.get_user_connections(user_id))
            if active_connections >= MAX_CONNECTIONS_PER_USER:
                await self.close(code=4002)
                return

            # Generate correlation ID
            correlation_id = str(uuid.uuid4())
            self.connection_metadata = {
                "user_id": user_id,
                "correlation_id": correlation_id,
                "connected_at": self.scope.get("connect_time", 0),
                "client": self.scope.get("client", ["unknown"])[0]
            }

            # Accept connection
            await self.accept()

            # Add user to relevant groups
            if user.is_buyer():
                group_name = REQUEST_GROUP.format(user_id)
                await self.channel_layer.group_add(group_name, self.channel_name)
                self.groups.add(group_name)

            logger.info(
                "WebSocket connection established",
                extra={
                    "user_id": user_id,
                    "correlation_id": correlation_id,
                    "client": self.connection_metadata["client"]
                }
            )

        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection with cleanup.
        
        Args:
            close_code: WebSocket close code
        """
        try:
            # Remove from all groups
            for group in self.groups:
                await self.channel_layer.group_discard(group, self.channel_name)
            self.groups.clear()

            # Log disconnection
            logger.info(
                "WebSocket connection closed",
                extra={
                    "close_code": close_code,
                    **self.connection_metadata
                }
            )

        except Exception as e:
            logger.error(f"Disconnection error: {str(e)}")

        finally:
            # Clear metadata
            self.connection_metadata = {}

    @validate_message
    async def receive_json(self, content: Dict[str, Any]):
        """
        Handle incoming JSON messages with validation and rate limiting.
        
        Args:
            content: Message content dictionary
        """
        try:
            # Check rate limit
            if not self.rate_limiter.allow():
                await self.handle_error(
                    "rate_limit_exceeded",
                    "Message rate limit exceeded",
                    {"limit": MESSAGE_RATE_LIMIT}
                )
                return

            message_type = content["type"]
            message_data = content.get("data", {})

            # Handle different message types
            if message_type == "proposal_update":
                await self.handle_proposal_update(message_data)
            elif message_type == "request_update":
                await self.handle_request_update(message_data)
            elif message_type == "ping":
                await self.handle_ping()

            # Send acknowledgment
            await self.send_json({
                "type": "ack",
                "message_id": content.get("message_id"),
                "status": "success"
            })

        except Exception as e:
            await self.handle_error(
                "message_processing_error",
                str(e),
                {"content": content}
            )

    async def handle_proposal_update(self, data: Dict[str, Any]):
        """
        Handle proposal update messages.
        
        Args:
            data: Proposal update data
        """
        try:
            proposal_id = data.get("proposal_id")
            action = data.get("action")
            
            if not proposal_id or not action:
                raise ValueError("Missing required proposal data")

            # Process proposal action
            if action == "accept":
                await self.proposal_service.accept_proposal(proposal_id)
            elif action == "reject":
                await self.proposal_service.reject_proposal(proposal_id)
            else:
                raise ValueError(f"Invalid proposal action: {action}")

            # Broadcast update
            group_name = PROPOSAL_GROUP.format(proposal_id)
            await self.channel_layer.group_send(
                group_name,
                {
                    "type": "proposal.updated",
                    "proposal_id": proposal_id,
                    "action": action,
                    "user_id": self.connection_metadata["user_id"]
                }
            )

        except Exception as e:
            await self.handle_error(
                "proposal_update_error",
                str(e),
                {"data": data}
            )

    async def handle_request_update(self, data: Dict[str, Any]):
        """
        Handle request update messages.
        
        Args:
            data: Request update data
        """
        try:
            request_id = data.get("request_id")
            if not request_id:
                raise ValueError("Missing request ID")

            # Broadcast update
            group_name = REQUEST_GROUP.format(request_id)
            await self.channel_layer.group_send(
                group_name,
                {
                    "type": "request.updated",
                    "request_id": request_id,
                    "data": data,
                    "user_id": self.connection_metadata["user_id"]
                }
            )

        except Exception as e:
            await self.handle_error(
                "request_update_error",
                str(e),
                {"data": data}
            )

    async def handle_ping(self):
        """Handle ping messages for connection monitoring."""
        await self.send_json({
            "type": "pong",
            "timestamp": self.scope.get("connect_time", 0)
        })

    async def handle_error(
        self,
        error_type: str,
        error_message: str,
        context: Optional[Dict] = None
    ):
        """
        Handle WebSocket errors with logging and client notification.
        
        Args:
            error_type: Type of error
            error_message: Error message
            context: Additional error context
        """
        try:
            # Log error
            logger.error(
                f"WebSocket error: {error_message}",
                extra={
                    "error_type": error_type,
                    "context": context,
                    **self.connection_metadata
                }
            )

            # Notify client
            await self.send_json({
                "type": "error",
                "error": error_type,
                "message": error_message
            })

        except Exception as e:
            logger.error(f"Error handling failed: {str(e)}")