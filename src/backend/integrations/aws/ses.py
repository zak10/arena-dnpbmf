"""
AWS Simple Email Service (SES) integration for Arena MVP platform.

This module provides secure email delivery capabilities with:
- Enhanced security for magic link authentication
- Rate limiting and domain validation
- Bounce handling and monitoring
- Bulk email support with batching

Version: 1.0.0
"""

import re
import time
from typing import Dict, List, Optional, Union

import boto3  # version: 1.26+
from botocore.exceptions import ClientError  # version: 1.29+
from django.conf import settings
from django.core.cache import cache

from core.exceptions import SystemError

# Global constants from settings
AWS_REGION = settings.AWS_REGION
AWS_ACCESS_KEY_ID = settings.AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY = settings.AWS_SECRET_ACCESS_KEY
EMAIL_RATE_LIMIT = settings.EMAIL_RATE_LIMIT
ALLOWED_EMAIL_DOMAINS = settings.ALLOWED_EMAIL_DOMAINS

# Retry configuration
MAX_RETRIES = 3
RETRY_BACKOFF = 2

class SESClient:
    """Enhanced AWS SES client with security features for magic links and system notifications."""
    
    def __init__(self) -> None:
        """Initialize SES client with enhanced security features."""
        # Validate AWS credentials
        if not all([AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]):
            raise SystemError(
                message="Missing AWS credentials",
                code="E4003",
                details={"service": "SES"}
            )

        # Initialize SES client with retry configuration
        self._ses_client = boto3.client(
            'ses',
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        self._aws_region = AWS_REGION
        self._rate_limits = {}

    def send_email(
        self,
        to_address: str,
        subject: str,
        html_content: str,
        from_address: str,
        reply_to: Optional[str] = None,
        is_magic_link: bool = False,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Send a single email with enhanced security for magic links.

        Args:
            to_address: Recipient email address
            subject: Email subject line
            html_content: HTML email content
            from_address: Sender email address
            reply_to: Optional reply-to address
            is_magic_link: Whether email contains authentication magic link
            metadata: Optional metadata for tracking

        Returns:
            str: Message ID from SES

        Raises:
            SystemError: If email sending fails
        """
        try:
            # Validate email addresses
            if not self.validate_email_address(to_address):
                raise SystemError(
                    message="Invalid recipient email address",
                    code="E4001",
                    details={"email": to_address}
                )

            # Check rate limits
            rate_limit_key = f"email_rate_limit:{to_address}"
            if cache.get(rate_limit_key, 0) >= EMAIL_RATE_LIMIT:
                raise SystemError(
                    message="Email rate limit exceeded",
                    code="E4001",
                    details={"email": to_address}
                )

            # Construct email message with security headers
            message = {
                'Subject': {'Data': subject},
                'Body': {'Html': {'Data': html_content}}
            }

            email_args = {
                'Source': from_address,
                'Destination': {'ToAddresses': [to_address]},
                'Message': message,
                'ConfigurationSetName': 'ArenaEmailMonitoring'
            }

            # Add reply-to if provided
            if reply_to:
                email_args['ReplyToAddresses'] = [reply_to]

            # Add special headers for magic links
            if is_magic_link:
                email_args['Tags'] = [
                    {'Name': 'email_type', 'Value': 'magic_link'},
                    {'Name': 'security_level', 'Value': 'high'}
                ]

            # Add custom metadata
            if metadata:
                email_args['Tags'].extend(
                    [{'Name': k, 'Value': str(v)} for k, v in metadata.items()]
                )

            # Send email with retry logic
            retries = 0
            while retries < MAX_RETRIES:
                try:
                    response = self._ses_client.send_email(**email_args)
                    break
                except ClientError as e:
                    retries += 1
                    if retries == MAX_RETRIES:
                        raise SystemError(
                            message="Failed to send email after retries",
                            code="E4003",
                            details={"error": str(e)}
                        )
                    time.sleep(RETRY_BACKOFF ** retries)

            # Update rate limiting
            cache.incr(rate_limit_key, 1)
            if not cache.ttl(rate_limit_key):
                cache.expire(rate_limit_key, 3600)  # 1 hour expiry

            return response['MessageId']

        except Exception as e:
            raise SystemError(
                message="Failed to send email",
                code="E4003",
                details={"error": str(e)}
            )

    def send_bulk_email(
        self,
        to_addresses: List[str],
        subject: str,
        html_content: str,
        from_address: str,
        metadata: Optional[Dict] = None
    ) -> List[str]:
        """
        Send bulk emails with enhanced security and rate limiting.

        Args:
            to_addresses: List of recipient email addresses
            subject: Email subject line
            html_content: HTML email content
            from_address: Sender email address
            metadata: Optional metadata for tracking

        Returns:
            List[str]: List of successful message IDs

        Raises:
            SystemError: If bulk email sending fails
        """
        message_ids = []
        failed_addresses = []

        # Validate all email addresses first
        valid_addresses = [
            addr for addr in to_addresses
            if self.validate_email_address(addr, check_ses_verification=False)
        ]

        # Process in batches of 50 (SES limit)
        batch_size = 50
        for i in range(0, len(valid_addresses), batch_size):
            batch = valid_addresses[i:i + batch_size]
            
            try:
                # Send batch with retry logic
                retries = 0
                while retries < MAX_RETRIES:
                    try:
                        response = self._ses_client.send_bulk_templated_email(
                            Source=from_address,
                            Destinations=[
                                {'Destination': {'ToAddresses': [addr]}}
                                for addr in batch
                            ],
                            DefaultContent={
                                'Subject': {'Data': subject},
                                'Html': {'Data': html_content}
                            },
                            ConfigurationSetName='ArenaEmailMonitoring',
                            DefaultTags=[
                                {'Name': 'email_type', 'Value': 'bulk'},
                                *[
                                    {'Name': k, 'Value': str(v)}
                                    for k, v in (metadata or {}).items()
                                ]
                            ]
                        )
                        message_ids.extend(
                            [r['MessageId'] for r in response['Status']]
                        )
                        break
                    except ClientError:
                        retries += 1
                        if retries == MAX_RETRIES:
                            failed_addresses.extend(batch)
                        time.sleep(RETRY_BACKOFF ** retries)

            except Exception as e:
                failed_addresses.extend(batch)
                continue

        if failed_addresses:
            raise SystemError(
                message="Some emails failed to send",
                code="E4003",
                details={
                    "failed_addresses": failed_addresses,
                    "successful_sends": len(message_ids)
                }
            )

        return message_ids

    def validate_email_address(
        self,
        email_address: str,
        check_ses_verification: bool = True
    ) -> bool:
        """
        Enhanced email validation with business rules.

        Args:
            email_address: Email address to validate
            check_ses_verification: Whether to verify SES status

        Returns:
            bool: True if email is valid and verified
        """
        # Basic format validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email_address):
            return False

        # Domain validation
        domain = email_address.split('@')[1]
        if domain not in ALLOWED_EMAIL_DOMAINS:
            return False

        # SES verification check if required
        if check_ses_verification:
            try:
                response = self._ses_client.get_identity_verification_attributes(
                    Identities=[email_address]
                )
                status = response['VerificationAttributes'].get(
                    email_address, {}
                ).get('VerificationStatus')
                return status == 'Success'
            except ClientError:
                return False

        return True

    def handle_bounce(self, bounce_data: Dict) -> bool:
        """
        Handle email bounce notifications.

        Args:
            bounce_data: Bounce notification data from SES

        Returns:
            bool: Success status
        """
        try:
            # Extract bounce details
            bounce_type = bounce_data.get('bounceType')
            bounced_recipients = bounce_data.get('bouncedRecipients', [])
            
            # Process each bounced recipient
            for recipient in bounced_recipients:
                email = recipient.get('emailAddress')
                if not email:
                    continue

                # Update recipient status in cache
                bounce_key = f"email_bounce:{email}"
                cache.set(bounce_key, {
                    'type': bounce_type,
                    'timestamp': time.time(),
                    'details': recipient
                }, timeout=86400)  # 24 hour retention

            return True

        except Exception as e:
            raise SystemError(
                message="Failed to handle bounce notification",
                code="E4003",
                details={"error": str(e)}
            )