"""
Authentication views for the Arena MVP platform.

This module implements secure authentication endpoints for:
- Magic link authentication
- Google OAuth authentication
- User profile management

With comprehensive security controls, audit logging, and compliance features.

Version: 1.0.0
"""

import logging
from typing import Dict, Any

from rest_framework.views import APIView  # version: 3.14+
from rest_framework.response import Response  # version: 3.14+
from rest_framework import status  # version: 3.14+
from rest_framework.decorators import throttle_classes  # version: 3.14+
from rest_framework.throttling import AnonRateThrottle  # version: 3.14+

from api.v1.auth.serializers import (
    MagicLinkSerializer,
    GoogleAuthSerializer,
    UserProfileSerializer
)
from users.services import UserService
from core.exceptions import AuthenticationError, SystemError
from core.constants import HTTP_HEADERS

# Configure logging
logger = logging.getLogger(__name__)

class MagicLinkView(APIView):
    """
    Handle magic link authentication with comprehensive security controls.
    """
    
    throttle_classes = [AnonRateThrottle]
    
    def __init__(self, *args, **kwargs):
        """Initialize magic link view with required services."""
        super().__init__(*args, **kwargs)
        self._user_service = UserService()

    def post(self, request) -> Response:
        """
        Create and send magic link with enhanced security checks.

        Args:
            request: HTTP request object containing email

        Returns:
            Response: Success response with security headers
        """
        try:
            # Validate request data
            serializer = MagicLinkSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Extract validated email
            email = serializer.validated_data['email']
            
            # Create and send magic link
            self._user_service.create_magic_link(
                email=email,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            # Log authentication attempt
            logger.info(
                "Magic link requested",
                extra={
                    'email': email,
                    'ip_address': request.META.get('REMOTE_ADDR')
                }
            )
            
            # Return success response with security headers
            return Response(
                {'message': 'Magic link sent successfully'},
                status=status.HTTP_200_OK,
                headers={
                    HTTP_HEADERS['REQUEST_ID']: request.id,
                    HTTP_HEADERS['RATE_LIMIT_REMAINING']: request.throttle_remaining
                }
            )
            
        except AuthenticationError as e:
            logger.warning(
                "Magic link request failed",
                extra={
                    'error': str(e),
                    'code': e.code,
                    'ip_address': request.META.get('REMOTE_ADDR')
                }
            )
            return Response(e.to_dict(), status=e.status_code)
            
        except Exception as e:
            logger.error(
                "Unexpected error in magic link request",
                extra={'error': str(e)}
            )
            return Response(
                {'error': 'Authentication failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request) -> Response:
        """
        Verify magic link token and authenticate user.

        Args:
            request: HTTP request object containing token

        Returns:
            Response: Success response with user data and session token
        """
        try:
            # Extract token from query params
            token = request.query_params.get('token')
            if not token:
                raise AuthenticationError(
                    message="Missing authentication token",
                    code="E1001"
                )
            
            # Verify token and get user
            user = self._user_service.verify_magic_link(
                token=token,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            # Serialize user data
            user_data = UserProfileSerializer(user).data
            
            # Log successful authentication
            logger.info(
                "Magic link authentication successful",
                extra={
                    'user_id': str(user.id),
                    'ip_address': request.META.get('REMOTE_ADDR')
                }
            )
            
            # Return user data with security headers
            return Response(
                user_data,
                status=status.HTTP_200_OK,
                headers={
                    HTTP_HEADERS['REQUEST_ID']: request.id,
                    'Set-Cookie': f'sessionid={request.session.session_key}; HttpOnly; Secure; SameSite=Strict'
                }
            )
            
        except AuthenticationError as e:
            logger.warning(
                "Magic link verification failed",
                extra={
                    'error': str(e),
                    'code': e.code,
                    'ip_address': request.META.get('REMOTE_ADDR')
                }
            )
            return Response(e.to_dict(), status=e.status_code)
            
        except Exception as e:
            logger.error(
                "Unexpected error in magic link verification",
                extra={'error': str(e)}
            )
            return Response(
                {'error': 'Authentication failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GoogleAuthView(APIView):
    """
    Handle Google OAuth authentication with security controls.
    """
    
    throttle_classes = [AnonRateThrottle]
    
    def __init__(self, *args, **kwargs):
        """Initialize Google auth view with required services."""
        super().__init__(*args, **kwargs)
        self._user_service = UserService()

    def post(self, request) -> Response:
        """
        Authenticate user with Google OAuth securely.

        Args:
            request: HTTP request object containing OAuth code

        Returns:
            Response: Success response with user data and session token
        """
        try:
            # Validate request data
            serializer = GoogleAuthSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Extract validated auth code
            auth_code = serializer.validated_data['auth_code']
            
            # Authenticate with Google
            user = self._user_service.authenticate_google(
                auth_code=auth_code,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            # Serialize user data
            user_data = UserProfileSerializer(user).data
            
            # Log successful authentication
            logger.info(
                "Google OAuth authentication successful",
                extra={
                    'user_id': str(user.id),
                    'ip_address': request.META.get('REMOTE_ADDR')
                }
            )
            
            # Return user data with security headers
            return Response(
                user_data,
                status=status.HTTP_200_OK,
                headers={
                    HTTP_HEADERS['REQUEST_ID']: request.id,
                    'Set-Cookie': f'sessionid={request.session.session_key}; HttpOnly; Secure; SameSite=Strict'
                }
            )
            
        except AuthenticationError as e:
            logger.warning(
                "Google OAuth authentication failed",
                extra={
                    'error': str(e),
                    'code': e.code,
                    'ip_address': request.META.get('REMOTE_ADDR')
                }
            )
            return Response(e.to_dict(), status=e.status_code)
            
        except Exception as e:
            logger.error(
                "Unexpected error in Google OAuth authentication",
                extra={'error': str(e)}
            )
            return Response(
                {'error': 'Authentication failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserProfileView(APIView):
    """
    Handle user profile operations with security and compliance controls.
    """
    
    def __init__(self, *args, **kwargs):
        """Initialize profile view with required services."""
        super().__init__(*args, **kwargs)
        self._user_service = UserService()

    def get(self, request) -> Response:
        """
        Retrieve user profile data securely.

        Args:
            request: HTTP request object

        Returns:
            Response: User profile data with security headers
        """
        try:
            # Verify authentication
            if not request.user.is_authenticated:
                raise AuthenticationError(
                    message="Authentication required",
                    code="E1001"
                )
            
            # Serialize user data
            user_data = UserProfileSerializer(request.user).data
            
            # Log profile access
            logger.info(
                "User profile accessed",
                extra={
                    'user_id': str(request.user.id),
                    'ip_address': request.META.get('REMOTE_ADDR')
                }
            )
            
            # Return profile data with security headers
            return Response(
                user_data,
                status=status.HTTP_200_OK,
                headers={HTTP_HEADERS['REQUEST_ID']: request.id}
            )
            
        except AuthenticationError as e:
            return Response(e.to_dict(), status=e.status_code)
            
        except Exception as e:
            logger.error(
                "Unexpected error retrieving user profile",
                extra={'error': str(e)}
            )
            return Response(
                {'error': 'Profile retrieval failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request) -> Response:
        """
        Update user profile data with compliance checks.

        Args:
            request: HTTP request object containing profile updates

        Returns:
            Response: Updated profile data with security headers
        """
        try:
            # Verify authentication
            if not request.user.is_authenticated:
                raise AuthenticationError(
                    message="Authentication required",
                    code="E1001"
                )
            
            # Validate request data
            serializer = UserProfileSerializer(
                request.user,
                data=request.data,
                partial=True
            )
            serializer.is_valid(raise_exception=True)
            
            # Update user profile
            updated_user = self._user_service.update_user_profile(
                user=request.user,
                profile_data=serializer.validated_data
            )
            
            # Serialize updated data
            user_data = UserProfileSerializer(updated_user).data
            
            # Log profile update
            logger.info(
                "User profile updated",
                extra={
                    'user_id': str(updated_user.id),
                    'ip_address': request.META.get('REMOTE_ADDR'),
                    'updated_fields': list(serializer.validated_data.keys())
                }
            )
            
            # Return updated data with security headers
            return Response(
                user_data,
                status=status.HTTP_200_OK,
                headers={HTTP_HEADERS['REQUEST_ID']: request.id}
            )
            
        except AuthenticationError as e:
            return Response(e.to_dict(), status=e.status_code)
            
        except Exception as e:
            logger.error(
                "Unexpected error updating user profile",
                extra={'error': str(e)}
            )
            return Response(
                {'error': 'Profile update failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )