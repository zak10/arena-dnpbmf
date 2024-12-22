"""
Email service module for Arena MVP platform.

Provides secure and reliable email notifications with:
- Magic link authentication
- Proposal notifications 
- Request confirmations
- Enhanced security and monitoring
- Rate limiting and error handling

Version: 1.0.0
"""

import logging
from typing import Dict, Optional

import bleach  # version: 6.0+
from celery import shared_task  # version: 5.3+
from django.conf import settings  # version: 4.2+
from django.template.loader import render_to_string  # version: 4.2+
from ratelimit import RateLimitExceeded  # version: 2.2+

from core.exceptions import EmailError, SystemError
from integrations.aws.ses import SESClient

# Configure logging
logger = logging.getLogger(__name__)

# Email template paths
EMAIL_TEMPLATES = {
    'magic_link': 'email/magic_link.html',
    'proposal_received': 'email/proposal_received.html',
    'request_created': 'email/request_created.html'
}

# Email configuration
DEFAULT_FROM_EMAIL = settings.DEFAULT_FROM_EMAIL
MAGIC_LINK_EXPIRY_MINUTES = 15
MAX_RETRIES = 3
RETRY_BACKOFF = 300  # 5 minutes
EMAIL_RATE_LIMIT = '100/hour'

class EmailService:
    """Enhanced service class for handling all email notifications in the Arena platform."""

    def __init__(self) -> None:
        """Initialize email service with enhanced configuration."""
        self._ses_client = SESClient()
        self._template_cache = {}
        self._from_email = DEFAULT_FROM_EMAIL
        
        # Configure logging with metadata
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)

    def validate_and_render_template(self, template_name: str, context: Dict) -> str:
        """
        Validate and render email template with error handling.

        Args:
            template_name: Name of the template to render
            context: Template context data

        Returns:
            str: Rendered and sanitized HTML content

        Raises:
            EmailError: If template validation or rendering fails
        """
        try:
            # Check template exists
            if template_name not in EMAIL_TEMPLATES:
                raise EmailError(
                    message=f"Invalid email template: {template_name}",
                    code="E4001",
                    details={"template": template_name}
                )

            template_path = EMAIL_TEMPLATES[template_name]

            # Check template cache
            cache_key = f"{template_path}:{hash(frozenset(context.items()))}"
            if cache_key in self._template_cache:
                return self._template_cache[cache_key]

            # Render template
            html_content = render_to_string(template_path, context)

            # Sanitize HTML content
            clean_html = bleach.clean(
                html_content,
                tags=['p', 'br', 'strong', 'em', 'a', 'ul', 'li', 'h1', 'h2', 'h3'],
                attributes={'a': ['href']},
                strip=True
            )

            # Cache rendered template
            self._template_cache[cache_key] = clean_html
            return clean_html

        except Exception as e:
            raise EmailError(
                message="Failed to render email template",
                code="E4001",
                details={"error": str(e), "template": template_name}
            )

    @shared_task(max_retries=MAX_RETRIES, retry_backoff=RETRY_BACKOFF)
    def send_magic_link(self, email: str, user_name: str, magic_link_url: str) -> str:
        """
        Send magic link authentication email with enhanced security.

        Args:
            email: Recipient email address
            user_name: User's name for personalization
            magic_link_url: One-time authentication URL

        Returns:
            str: Message ID from SES

        Raises:
            EmailError: If email sending fails
            RateLimitExceeded: If rate limit is exceeded
        """
        try:
            # Validate business email
            if not self._ses_client.validate_email_address(email):
                raise EmailError(
                    message="Invalid business email address",
                    code="E4001",
                    details={"email": email}
                )

            # Render magic link template
            context = {
                'user_name': user_name,
                'magic_link_url': magic_link_url,
                'expiry_minutes': MAGIC_LINK_EXPIRY_MINUTES
            }
            html_content = self.validate_and_render_template('magic_link', context)

            # Send email with security headers
            message_id = self._ses_client.send_email(
                to_address=email,
                subject="Your Arena Authentication Link",
                html_content=html_content,
                from_address=self._from_email,
                is_magic_link=True,
                metadata={
                    'email_type': 'magic_link',
                    'expiry_minutes': MAGIC_LINK_EXPIRY_MINUTES
                }
            )

            # Log success
            self.logger.info(
                "Magic link email sent",
                extra={
                    'email': email,
                    'message_id': message_id,
                    'email_type': 'magic_link'
                }
            )

            return message_id

        except RateLimitExceeded:
            raise EmailError(
                message="Email rate limit exceeded",
                code="E4001",
                details={"email": email}
            )
        except Exception as e:
            raise EmailError(
                message="Failed to send magic link email",
                code="E4001",
                details={"error": str(e), "email": email}
            )

    @shared_task(max_retries=MAX_RETRIES, retry_backoff=RETRY_BACKOFF)
    def send_proposal_received(
        self,
        email: str,
        user_name: str,
        request_id: str,
        vendor_name: str,
        proposal_url: str
    ) -> str:
        """
        Send proposal received notification email.

        Args:
            email: Recipient email address
            user_name: User's name for personalization
            request_id: Request identifier
            vendor_name: Name of vendor who submitted proposal
            proposal_url: URL to view the proposal

        Returns:
            str: Message ID from SES
        """
        try:
            context = {
                'user_name': user_name,
                'vendor_name': vendor_name,
                'proposal_url': proposal_url,
                'request_id': request_id
            }
            html_content = self.validate_and_render_template('proposal_received', context)

            message_id = self._ses_client.send_email(
                to_address=email,
                subject=f"New Proposal Received from {vendor_name}",
                html_content=html_content,
                from_address=self._from_email,
                metadata={
                    'email_type': 'proposal_received',
                    'request_id': request_id,
                    'vendor_name': vendor_name
                }
            )

            self.logger.info(
                "Proposal received email sent",
                extra={
                    'email': email,
                    'message_id': message_id,
                    'request_id': request_id,
                    'vendor_name': vendor_name
                }
            )

            return message_id

        except Exception as e:
            raise EmailError(
                message="Failed to send proposal notification",
                code="E4001",
                details={"error": str(e), "email": email}
            )

    @shared_task(max_retries=MAX_RETRIES, retry_backoff=RETRY_BACKOFF)
    def send_request_created(
        self,
        email: str,
        user_name: str,
        request_id: str,
        request_url: str
    ) -> str:
        """
        Send request creation confirmation email.

        Args:
            email: Recipient email address
            user_name: User's name for personalization
            request_id: Request identifier
            request_url: URL to view the request

        Returns:
            str: Message ID from SES
        """
        try:
            context = {
                'user_name': user_name,
                'request_id': request_id,
                'request_url': request_url
            }
            html_content = self.validate_and_render_template('request_created', context)

            message_id = self._ses_client.send_email(
                to_address=email,
                subject="Your Arena Request Has Been Created",
                html_content=html_content,
                from_address=self._from_email,
                metadata={
                    'email_type': 'request_created',
                    'request_id': request_id
                }
            )

            self.logger.info(
                "Request created email sent",
                extra={
                    'email': email,
                    'message_id': message_id,
                    'request_id': request_id
                }
            )

            return message_id

        except Exception as e:
            raise EmailError(
                message="Failed to send request confirmation",
                code="E4001",
                details={"error": str(e), "email": email}
            )

# Export EmailService class
__all__ = ['EmailService']