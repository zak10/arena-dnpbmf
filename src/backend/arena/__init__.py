"""
Root initialization file for the Arena MVP Django application.

This module configures Celery integration and exposes the application version.
It serves as the entry point for the Arena platform, providing access to the
Celery task queue for asynchronous processing of AI requirements parsing,
proposal management, and notifications.

Version: 0.1.0
"""

# Import the Celery application instance
from arena.celery import app

# Define the application version
__version__ = "0.1.0"

# Export the Celery app instance and version
__all__ = ["app"]

# Make sure the app is properly configured
# This ensures that the Celery app is configured with all the settings
# from arena.celery including:
# - Redis broker connection
# - Task queues (ai_processing, proposals, notifications)
# - Performance settings (task timeouts, retries, rate limits)
# - Worker configuration (prefetch, memory limits)
app.set_default()