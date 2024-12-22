"""
Django models for managing vendor proposals in the Arena MVP platform.

This module implements:
- Secure proposal management with data classification
- Standardized proposal templates and validation
- Document storage and retention policies
- Enhanced security controls and audit logging

Version: 1.0.0
"""

import logging
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.models.base import BaseModel
from core.constants import DataClassification
from requests.models import Request
from vendors.models import Vendor

# Configure logging
logger = logging.getLogger(__name__)

# Proposal status choices
DRAFT = 'draft'
SUBMITTED = 'submitted'
ACCEPTED = 'accepted'
REJECTED = 'rejected'

PROPOSAL_STATUS_CHOICES = (
    (DRAFT, 'Draft'),
    (SUBMITTED, 'Submitted'),
    (ACCEPTED, 'Accepted'),
    (REJECTED, 'Rejected')
)

# Document type choices
DOCUMENT_TYPES = (
    ('TECHNICAL', 'Technical Specifications'),
    ('SECURITY', 'Security Whitepaper'),
    ('PRICING', 'Pricing Details'),
    ('IMPLEMENTATION', 'Implementation Plan'),
    ('OTHER', 'Other Documentation')
)

# Default data classification
DEFAULT_DATA_CLASSIFICATION = DataClassification.SENSITIVE

# File size limits (in bytes)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

class Proposal(BaseModel):
    """
    Model representing a vendor's proposal for a software evaluation request.
    
    Implements:
    - Secure proposal data management
    - Standardized proposal format
    - Status tracking and validation
    - Data retention policies
    """
    
    # Core proposal fields
    request = models.ForeignKey(
        Request,
        on_delete=models.PROTECT,
        related_name='proposals',
        help_text="Associated software evaluation request"
    )
    
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.PROTECT,
        related_name='proposals',
        help_text="Vendor submitting the proposal"
    )
    
    status = models.CharField(
        max_length=20,
        choices=PROPOSAL_STATUS_CHOICES,
        default=DRAFT,
        db_index=True,
        help_text="Current proposal status"
    )
    
    pricing_details = models.JSONField(
        default=dict,
        help_text="Structured pricing information"
    )
    
    vendor_pitch = models.TextField(
        help_text="Vendor's pitch and value proposition"
    )
    
    feature_matrix = models.JSONField(
        default=dict,
        help_text="Detailed feature comparison matrix"
    )
    
    implementation_time_weeks = models.IntegerField(
        null=True,
        blank=True,
        help_text="Estimated implementation time in weeks"
    )
    
    expires_at = models.DateTimeField(
        help_text="When proposal data should be purged"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['request', 'vendor']),
            models.Index(fields=['expires_at'])
        ]
        verbose_name = 'Proposal'
        verbose_name_plural = 'Proposals'

    def __init__(self, *args, **kwargs):
        """Initialize proposal with security settings and defaults."""
        super().__init__(*args, **kwargs)
        
        # Set data classification
        self.data_classification = DEFAULT_DATA_CLASSIFICATION.value
        
        # Initialize status if new
        if not self.pk and not self.status:
            self.status = DRAFT
            
        # Set default empty pricing and feature matrix
        if not self.pricing_details:
            self.pricing_details = {}
        if not self.feature_matrix:
            self.feature_matrix = {}
            
        # Calculate expiration date (2 years from creation)
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=730)

    def save(self, *args, **kwargs):
        """
        Override save to validate proposal data and enforce security policies.
        
        Validates:
        - Request and vendor status
        - Pricing details format
        - Feature matrix completeness
        - Data retention policies
        
        Returns:
            Proposal: Saved proposal instance
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate request is active
        if not self.request or self.request.status == 'cancelled':
            raise ValidationError("Invalid or cancelled request")
            
        # Validate vendor is active
        if not self.vendor or self.vendor.status != 'active':
            raise ValidationError("Invalid or inactive vendor")
            
        # Validate pricing details schema
        if not isinstance(self.pricing_details, dict):
            raise ValidationError("Invalid pricing details format")
            
        # Validate feature matrix
        if not isinstance(self.feature_matrix, dict):
            raise ValidationError("Invalid feature matrix format")
            
        # Ensure expiration date is set
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=730)
            
        # Log save operation
        logger.info(
            f"Saving proposal {self.pk} for request {self.request.pk} "
            f"from vendor {self.vendor.pk} with status {self.status}"
        )
        
        return super().save(*args, **kwargs)

    def submit(self):
        """
        Submit proposal for buyer review.
        
        Validates all required fields and changes status to SUBMITTED.
        
        Returns:
            bool: Success status
            
        Raises:
            ValidationError: If proposal is incomplete
        """
        required_fields = [
            'pricing_details',
            'vendor_pitch',
            'feature_matrix',
            'implementation_time_weeks'
        ]
        
        # Check required fields
        for field in required_fields:
            if not getattr(self, field):
                raise ValidationError(f"Missing required field: {field}")
                
        # Validate pricing details
        if not self.pricing_details.get('base_price'):
            raise ValidationError("Base price is required")
            
        # Check feature matrix completeness
        if not self.feature_matrix.get('requirements'):
            raise ValidationError("Feature matrix requirements missing")
            
        # Update status
        self.status = SUBMITTED
        
        # Log submission
        logger.info(f"Submitting proposal {self.pk} for request {self.request.pk}")
        
        self.save()
        return True

class ProposalDocument(BaseModel):
    """
    Model representing supporting documents attached to a proposal.
    
    Implements:
    - Secure document storage
    - File type validation
    - Size limits
    - Data retention
    """
    
    proposal = models.ForeignKey(
        Proposal,
        on_delete=models.CASCADE,
        related_name='documents',
        help_text="Associated proposal"
    )
    
    title = models.CharField(
        max_length=255,
        help_text="Document title"
    )
    
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPES,
        help_text="Type of document"
    )
    
    file_path = models.CharField(
        max_length=1024,
        help_text="S3 file path"
    )
    
    file_size = models.IntegerField(
        help_text="File size in bytes"
    )

    class Meta:
        ordering = ['document_type', 'title']
        indexes = [
            models.Index(fields=['proposal', 'document_type'])
        ]
        verbose_name = 'Proposal Document'
        verbose_name_plural = 'Proposal Documents'

    def __init__(self, *args, **kwargs):
        """Initialize document with security settings."""
        super().__init__(*args, **kwargs)
        
        # Set data classification
        self.data_classification = DEFAULT_DATA_CLASSIFICATION.value

    def save(self, *args, **kwargs):
        """
        Override save to validate document data.
        
        Validates:
        - File existence
        - Size limits
        - Allowed types
        - Path security
        
        Returns:
            ProposalDocument: Saved document instance
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate file exists
        if not self.file_path:
            raise ValidationError("File path is required")
            
        # Check file size
        if self.file_size > MAX_FILE_SIZE:
            raise ValidationError(f"File size exceeds limit of {MAX_FILE_SIZE} bytes")
            
        # Validate file type
        if not any(t[0] == self.document_type for t in DOCUMENT_TYPES):
            raise ValidationError(f"Invalid document type: {self.document_type}")
            
        # Sanitize file path
        self.file_path = self.file_path.strip().replace('../', '')
            
        # Log save operation
        logger.info(
            f"Saving document for proposal {self.proposal.pk}: "
            f"{self.title} ({self.document_type})"
        )
        
        return super().save(*args, **kwargs)