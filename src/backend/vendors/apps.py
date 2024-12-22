"""
Django application configuration for the vendors module of the Arena MVP platform.

This module implements:
- Vendor management application settings
- Security controls and data protection
- Audit logging and monitoring
- Initialization logic with SOC 2 compliance

Version: 1.0.0
"""

import logging
from django.apps import AppConfig  # Django 4.2+
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

# Configure logging
logger = logging.getLogger(__name__)

class VendorsConfig(AppConfig):
    """
    Django application configuration class for the vendors module, implementing
    comprehensive security controls and initialization logic.
    """

    name = 'vendors'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Vendor Management'

    def ready(self):
        """
        Performs comprehensive vendor application initialization with security controls
        when Django starts.
        """
        try:
            # Import vendor models and data classification settings
            from .models import Vendor, VENDOR_STATUS_CHOICES
            from core.constants import DataClassification

            # Initialize vendor data security controls
            self._initialize_security_controls()

            # Set up field-level encryption for sensitive data
            self._configure_field_encryption()

            # Configure vendor data access logging
            self._setup_audit_logging()

            # Initialize data retention policies
            self._initialize_data_retention()

            # Set up vendor data masking rules
            self._configure_data_masking()

            # Configure vendor monitoring
            self._setup_monitoring()

            logger.info("Vendor application initialized successfully with security controls")

        except Exception as e:
            logger.error(f"Failed to initialize vendor application: {str(e)}")
            raise ImproperlyConfigured("Vendor application initialization failed") from e

    def _initialize_security_controls(self):
        """Configure core security controls for vendor data protection."""
        # Set default data classification for vendor data
        settings.VENDOR_DATA_CLASSIFICATION = DataClassification.SENSITIVE.value

        # Configure encryption settings
        settings.VENDOR_ENCRYPTION = {
            'algorithm': 'AES-256-GCM',
            'key_rotation_days': 90,
            'backup_retention_days': 30
        }

        # Set up access control rules
        settings.VENDOR_ACCESS_CONTROLS = {
            'require_mfa': True,
            'session_timeout_minutes': 30,
            'max_failed_attempts': 5
        }

        logger.info("Vendor security controls initialized")

    def _configure_field_encryption(self):
        """Set up field-level encryption for sensitive vendor data."""
        # Define fields requiring encryption
        settings.VENDOR_ENCRYPTED_FIELDS = [
            'tax_id',
            'bank_details',
            'api_credentials',
            'contact_details'
        ]

        # Configure encryption keys and rotation
        settings.FIELD_ENCRYPTION = {
            'key_provider': 'django_encryption.providers.aws.KMSProvider',
            'auto_rotate_keys': True,
            'rotation_period_days': 90
        }

        logger.info("Vendor field-level encryption configured")

    def _setup_audit_logging(self):
        """Configure comprehensive audit logging for vendor operations."""
        # Set up audit log settings
        settings.VENDOR_AUDIT_CONFIG = {
            'log_all_access': True,
            'log_changes': True,
            'log_exports': True,
            'retention_period_days': 365
        }

        # Configure audit trail handlers
        settings.AUDIT_HANDLERS = [
            'vendors.audit.DatabaseAuditHandler',
            'vendors.audit.CloudWatchHandler'
        ]

        logger.info("Vendor audit logging configured")

    def _initialize_data_retention(self):
        """Set up data retention policies for vendor data."""
        # Configure retention periods
        settings.VENDOR_RETENTION = {
            'active_period_days': 730,  # 2 years
            'archive_period_days': 2555,  # 7 years
            'backup_retention_days': 90
        }

        # Set up cleanup jobs
        settings.DATA_CLEANUP_JOBS = [
            'vendors.cleanup.ArchiveInactiveVendors',
            'vendors.cleanup.PurgeExpiredData'
        ]

        logger.info("Vendor data retention policies initialized")

    def _configure_data_masking(self):
        """Set up data masking rules for vendor PII protection."""
        # Define masking rules
        settings.VENDOR_MASKING_RULES = {
            'email': 'partial',
            'phone': 'last_4_digits',
            'tax_id': 'full_mask',
            'bank_details': 'full_mask'
        }

        # Configure masking handlers
        settings.MASKING_HANDLERS = [
            'vendors.masking.PIIMaskingHandler',
            'vendors.masking.ExportMaskingHandler'
        ]

        logger.info("Vendor data masking rules configured")

    def _setup_monitoring(self):
        """Configure vendor data access monitoring and alerts."""
        # Set up monitoring rules
        settings.VENDOR_MONITORING = {
            'track_access_patterns': True,
            'alert_on_suspicious': True,
            'rate_limit_threshold': 100,
            'alert_channels': ['email', 'slack']
        }

        # Configure alert handlers
        settings.MONITORING_HANDLERS = [
            'vendors.monitoring.AccessMonitor',
            'vendors.monitoring.SecurityAlertHandler'
        ]

        logger.info("Vendor monitoring configured")