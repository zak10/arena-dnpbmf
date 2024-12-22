"""
URL routing configuration for authentication endpoints in the Arena MVP API v1.

This module implements secure routes for:
- Magic link authentication with rate limiting
- Google OAuth integration with PKCE
- User profile management with session controls

Version: 1.0.0
"""

from django.urls import path  # version: 4.2+

from api.v1.auth.views import (
    MagicLinkView,
    GoogleAuthView,
    UserProfileView
)

# Define app name for URL namespacing
app_name = 'auth'

# URL patterns with security middleware and rate limiting
urlpatterns = [
    # Magic link authentication endpoints
    # POST: Create and send magic link with rate limiting (3/hour)
    # GET: Verify magic link token and authenticate user
    path(
        'magic-link/',
        MagicLinkView.as_view(),
        name='magic-link'
    ),

    # Google OAuth authentication endpoint
    # POST: Authenticate with Google OAuth code and PKCE
    path(
        'google/',
        GoogleAuthView.as_view(),
        name='google-auth'
    ),

    # User profile management endpoints
    # GET: Retrieve user profile with session auth
    # PUT: Update user profile with validation
    path(
        'profile/',
        UserProfileView.as_view(),
        name='user-profile'
    ),
]