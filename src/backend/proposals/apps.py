"""
Django application configuration for the proposals module.
Handles initialization of proposal management, security controls, and real-time updates.

Version: Django 4.2+
"""

from django.apps import AppConfig
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class ProposalsConfig(AppConfig):
    """
    Django application configuration class for the proposals module.
    
    Manages proposal-related functionality including:
    - Standardized proposal templates
    - Side-by-side comparison capabilities
    - Document storage security
    - Status tracking and auditing
    - Data classification and security controls
    """

    # Basic application configuration
    name = 'proposals'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Proposals Management'

    def ready(self):
        """
        Performs application initialization when Django starts.
        
        Sets up:
        - Security controls for sensitive proposal data
        - Document storage security configuration
        - Audit logging for proposal operations
        """
        # Import models lazily to avoid circular imports
        try:
            from . import models
            from . import signals
        except ImportError as e:
            logger.error(f"Failed to import proposal models: {str(e)}")
            raise

        # Configure security settings for sensitive proposal data
        self._configure_data_security()
        
        # Configure document storage security
        self._configure_storage_security()
        
        # Set up audit logging
        self._configure_audit_logging()

    def _configure_data_security(self):
        """Configure security controls for sensitive proposal data."""
        try:
            # Set data classification for proposal information
            settings.SENSITIVE_FIELDS.update({
                'proposals.Proposal': [
                    'pricing',
                    'vendor_pitch',
                    'confidential_notes'
                ]
            })

            # Configure field-level encryption for sensitive data
            settings.ENCRYPTED_FIELDS.update({
                'proposals.Proposal': [
                    'pricing_details',
                    'vendor_confidential'
                ]
            })

        except Exception as e:
            logger.error(f"Failed to configure proposal data security: {str(e)}")
            raise

    def _configure_storage_security(self):
        """Configure security for proposal document storage."""
        try:
            # Set secure storage configuration for proposal documents
            settings.PROPOSAL_STORAGE = {
                'encryption': 'AES-256',
                'access_control': 'role_based',
                'retention_period': settings.PROPOSAL_RETENTION_DAYS,
                'backup_enabled': True
            }

            # Configure document scanning
            settings.DOCUMENT_SCAN_SETTINGS = {
                'enabled': True,
                'scan_on_upload': True,
                'blocked_file_types': [
                    'exe', 'dll', 'js', 'vbs', 'bat'
                ]
            }

        except Exception as e:
            logger.error(f"Failed to configure proposal storage security: {str(e)}")
            raise

    def _configure_audit_logging(self):
        """Configure audit logging for proposal operations."""
        try:
            # Set up audit logging configuration
            settings.AUDIT_LOGGING.update({
                'proposals': {
                    'enabled': True,
                    'events': [
                        'proposal.created',
                        'proposal.updated',
                        'proposal.status_changed',
                        'proposal.accessed',
                        'proposal.deleted'
                    ],
                    'retention': settings.AUDIT_LOG_RETENTION_DAYS
                }
            })

            # Configure audit log handlers
            logging.getLogger('proposals.audit').handlers = [
                logging.handlers.RotatingFileHandler(
                    filename=settings.PROPOSAL_AUDIT_LOG_PATH,
                    maxBytes=10485760,  # 10MB
                    backupCount=10
                )
            ]

        except Exception as e:
            logger.error(f"Failed to configure proposal audit logging: {str(e)}")
            raise