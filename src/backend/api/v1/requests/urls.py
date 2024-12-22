"""
URL routing configuration for software evaluation request endpoints in the Arena MVP platform.

Implements secure REST API routes for:
- Request creation and management
- Document upload support
- AI-powered requirement parsing
- Vendor matching

Version: 1.0.0
"""

from django.urls import path, include  # version 4.2+
from rest_framework.routers import DefaultRouter  # version 3.14+

from api.v1.requests.views import RequestViewSet

# Configure router with trailing slash for consistency
router = DefaultRouter(trailing_slash=True)

# Register request viewset with enhanced security
router.register(
    prefix='',  # Empty prefix since we're already under /api/v1/requests/
    viewset=RequestViewSet,
    basename='request'
)

# Define app name for reverse URL lookups
app_name = 'requests'

# URL patterns with router-generated routes
urlpatterns = [
    # Include all router-generated routes with security middleware
    path('', include(router.urls)),
]

"""
Generated URL patterns include:

GET /api/v1/requests/
    - List requests for authenticated buyer
    - Supports filtering and pagination
    - Cached responses

POST /api/v1/requests/
    - Create new software evaluation request
    - Validates input data
    - Triggers AI processing

GET /api/v1/requests/{id}/
    - Retrieve single request details
    - Validates user permissions
    - Cached responses

PUT /api/v1/requests/{id}/
    - Update request details
    - Draft status only
    - Validates changes

POST /api/v1/requests/{id}/submit/
    - Submit request for vendor matching
    - Triggers async processing
    - Status transition validation

POST /api/v1/requests/{id}/cancel/
    - Cancel active request
    - Status transition validation
    - Cleanup processing
"""