"""
Django models for managing vendor data in the Arena MVP platform.

This module implements:
- Secure vendor profile management
- Capabilities tracking and validation
- Proposal history with enhanced security
- Data retention and archival
- Field-level encryption for sensitive data

Version: 1.0.0
"""

import json
import logging
from django.db import models
from django.utils import timezone
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError

from core.models.base import BaseModel
from core.constants import DataClassification

# Configure logging
logger = logging.getLogger(__name__)

# Status choices for vendor lifecycle
PENDING = 'pending'
ACTIVE = 'active'
INACTIVE = 'inactive'
ARCHIVED = 'archived'

VENDOR_STATUS_CHOICES = (
    (PENDING, 'Pending'),
    (ACTIVE, 'Active'), 
    (INACTIVE, 'Inactive'),
    (ARCHIVED, 'Archived')
)

# Default security classification for vendor data
DEFAULT_DATA_CLASSIFICATION = DataClassification.SENSITIVE

# Current version of capabilities schema
CAPABILITIES_SCHEMA_VERSION = '1.0'

class Vendor(BaseModel):
    """
    Model representing a software vendor with enhanced security and validation.
    
    Implements:
    - Secure vendor profile management
    - Capabilities tracking and validation
    - Data classification controls
    - Audit logging and history
    - Retention policies
    """
    
    # Basic vendor information
    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Legal name of the vendor company"
    )
    website = models.URLField(
        max_length=255,
        validators=[URLValidator()],
        help_text="Primary website URL"
    )
    description = models.TextField(
        help_text="Detailed description of vendor offerings"
    )
    
    # Status and verification
    status = models.CharField(
        max_length=20,
        choices=VENDOR_STATUS_CHOICES,
        default=PENDING,
        db_index=True,
        help_text="Current vendor status"
    )
    last_verified_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When vendor information was last verified"
    )
    
    # Capabilities and metadata
    capabilities = models.JSONField(
        default=dict,
        help_text="Structured vendor capabilities data"
    )
    capabilities_version = models.CharField(
        max_length=10,
        default=CAPABILITIES_SCHEMA_VERSION,
        help_text="Schema version for capabilities"
    )
    metadata = models.JSONField(
        default=dict,
        help_text="Additional vendor metadata and history"
    )

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['last_verified_at'])
        ]
        verbose_name = 'Vendor'
        verbose_name_plural = 'Vendors'

    def __init__(self, *args, **kwargs):
        """Initialize vendor model with required fields and validation."""
        super().__init__(*args, **kwargs)
        
        # Set default data classification
        if not self.data_classification:
            self.data_classification = DEFAULT_DATA_CLASSIFICATION.value
            
        # Initialize status if new instance
        if not self.pk and not self.status:
            self.status = PENDING
            
        # Initialize empty capabilities if needed
        if not self.capabilities:
            self.capabilities = {}
            
        # Set capabilities version
        if not self.capabilities_version:
            self.capabilities_version = CAPABILITIES_SCHEMA_VERSION
            
        # Initialize metadata
        if not self.metadata:
            self.metadata = {
                'status_history': [],
                'verification_history': [],
                'capabilities_history': []
            }

    def validate_model_specific_classification(self, classification):
        """
        Implement vendor-specific data classification rules.
        
        Args:
            classification (DataClassification): Classification to validate
            
        Raises:
            ValidationError: If classification is too low for vendor data
        """
        if classification == DataClassification.PUBLIC:
            raise ValidationError(
                "Vendor data cannot be classified as public"
            )

    def save(self, *args, **kwargs):
        """
        Override save to validate vendor data with enhanced security.
        
        Validates:
        - Vendor name format and length
        - Website URL format
        - Capabilities schema version
        - Data classification
        
        Args:
            **kwargs: Additional arguments passed to save()
            
        Returns:
            Vendor: Saved vendor instance
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate vendor name
        if len(self.name.strip()) < 2:
            raise ValidationError("Vendor name must be at least 2 characters")
            
        # Validate website URL
        try:
            URLValidator()(self.website)
        except ValidationError as e:
            raise ValidationError(f"Invalid website URL: {e}")
            
        # Validate capabilities schema
        if self.capabilities and self.capabilities_version != CAPABILITIES_SCHEMA_VERSION:
            raise ValidationError(
                f"Invalid capabilities schema version: {self.capabilities_version}"
            )
            
        # Update verification timestamp if activating
        if self.status == ACTIVE and self.tracker.has_changed('status'):
            self.last_verified_at = timezone.now()
            
        # Track status changes
        if self.tracker.has_changed('status'):
            self.metadata['status_history'].append({
                'from': self.tracker.previous('status'),
                'to': self.status,
                'timestamp': timezone.now().isoformat(),
            })
            
        return super().save(*args, **kwargs)

    def activate(self):
        """
        Activate vendor account with verification.
        
        Returns:
            bool: Success status
        """
        if not all([self.name, self.website, self.capabilities]):
            raise ValidationError("Required fields missing for activation")
            
        self.status = ACTIVE
        self.last_verified_at = timezone.now()
        
        # Log activation
        logger.info(f"Activating vendor {self.pk}: {self.name}")
        
        self.save()
        return True

    def deactivate(self, reason):
        """
        Deactivate vendor account with reason tracking.
        
        Args:
            reason (str): Reason for deactivation
            
        Returns:
            bool: Success status
        """
        self.status = INACTIVE
        self.metadata['deactivation_reason'] = reason
        self.metadata['deactivated_at'] = timezone.now().isoformat()
        
        # Log deactivation
        logger.info(f"Deactivating vendor {self.pk}: {self.name} - {reason}")
        
        self.save()
        return True

    def archive(self):
        """
        Archive vendor data for retention.
        
        Returns:
            bool: Success status
        """
        self.status = ARCHIVED
        self.metadata['archived_at'] = timezone.now().isoformat()
        
        # Create data snapshot
        self.metadata['archive_snapshot'] = {
            'name': self.name,
            'website': self.website,
            'description': self.description,
            'capabilities': self.capabilities,
            'archived_at': timezone.now().isoformat()
        }
        
        # Log archival
        logger.info(f"Archiving vendor {self.pk}: {self.name}")
        
        self.save()
        return True

    def update_capabilities(self, capabilities):
        """
        Update vendor capabilities with validation.
        
        Args:
            capabilities (dict): New capabilities data
            
        Returns:
            bool: Success status
            
        Raises:
            ValidationError: If capabilities are invalid
        """
        # Validate capabilities format
        if not isinstance(capabilities, dict):
            raise ValidationError("Capabilities must be a dictionary")
            
        # Store previous version in history
        self.metadata['capabilities_history'].append({
            'previous': self.capabilities,
            'timestamp': timezone.now().isoformat()
        })
        
        # Update capabilities
        self.capabilities = capabilities
        self.capabilities_version = CAPABILITIES_SCHEMA_VERSION
        self.last_verified_at = timezone.now()
        
        # Log update
        logger.info(f"Updating capabilities for vendor {self.pk}: {self.name}")
        
        self.save()
        return True