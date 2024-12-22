"""
Initialization module for the Arena MVP notifications app.

Provides email notification services with:
- Magic link authentication emails
- Proposal notifications
- Request confirmations
- Enhanced security and monitoring
- Rate limiting and error handling

Version: 1.0.0
"""

from notifications.apps import NotificationsConfig
from notifications.email import EmailService

# Set default Django app config
default_app_config = 'notifications.apps.NotificationsConfig'

# Initialize email service instance
email_service = EmailService()

# Export email notification functionality
__all__ = [
    'email_service',
    'EmailService'
]