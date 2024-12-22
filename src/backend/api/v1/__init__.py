"""
Initialization module for Arena MVP API v1 package.

This module defines version metadata and imports all API endpoint modules for:
- Authentication
- Request management
- Proposal handling
- Vendor operations

Version: 1.0.0
"""

# Version metadata for API routing and documentation
VERSION = "v1"
API_VERSION = "1.0.0"
API_TITLE = "Arena MVP API"
API_DESCRIPTION = "API for Arena software evaluation platform"

# Import URL patterns from endpoint modules
from api.v1.auth.urls import urlpatterns as auth_urlpatterns
from api.v1.requests.urls import urlpatterns as request_urlpatterns
from api.v1.proposals.urls import urlpatterns as proposal_urlpatterns
from api.v1.vendors.urls import urlpatterns as vendor_urlpatterns

# Export version metadata and URL patterns
__all__ = [
    'VERSION',
    'API_VERSION', 
    'API_TITLE',
    'API_DESCRIPTION',
    'auth_urlpatterns',
    'request_urlpatterns',
    'proposal_urlpatterns',
    'vendor_urlpatterns'
]