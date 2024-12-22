"""Arena MVP REST API package initialization.

This module initializes the Arena MVP REST API package and configures default
application settings. It provides version information and Django application
configuration for the API module.

Version follows semantic versioning (MAJOR.MINOR.PATCH).
Major: Breaking changes
Minor: New features, backward compatible
Patch: Bug fixes, backward compatible

Attributes:
    __version__ (str): Current API version
    default_app_config (str): Django application configuration path
"""

from typing import TYPE_CHECKING  # Python 3.11+

if TYPE_CHECKING:
    from api.apps import ApiConfig

# API version following semantic versioning (MAJOR.MINOR.PATCH)
__version__: str = '1.0.0'

# Default Django application configuration
default_app_config: str = 'api.apps.ApiConfig'