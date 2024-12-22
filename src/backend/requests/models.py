"""
Django models for managing software evaluation requests in the Arena MVP platform.

This module implements:
- Secure request management with data classification
- AI-powered requirement parsing and vendor matching
- Document handling and retention policies
- Enhanced validation and security controls

Version: 1.0.0
"""

import logging
from django.db import models
from django.core.cache import cache
from django.utils import timezone
from django.core.exceptions import ValidationError

from core.models.base import BaseModel
from core.constants import DataClassification, RequestStatus
from users.models import User
from vendors.models import Vendor

# Configure logging
logger = logging.getLogger(__name__)

# Request status choices
REQUEST_STATUS_CHOICES = (
    (RequestStatus.DRAFT.value, 'Draft'),
    (RequestStatus.SUBMITTED.value, 'Submitted'),
    (RequestStatus.IN_REVIEW.value, 'In Review'),
    (RequestStatus.COMPLETED.value, 'Completed'),
    (RequestStatus.CANCELLED.value, 'Cancelled')
)

# Requirement types
REQUIREMENT_TYPES = (
    ('FUNCTIONAL', 'Functional'),
    ('TECHNICAL', 'Technical'),
    ('BUSINESS', 'Business'),
    ('SECURITY', 'Security')
)

# Data retention periods (in days)
ACTIVE_REQUEST_RETENTION_DAYS = 365  # 1 year
COMPLETED_REQUEST_RETENTION_DAYS = 730  # 2 years

# Cache settings
VENDOR_MATCH_CACHE_TTL = 3600  # 1 hour

class Request(BaseModel):
    """
    Model representing a software evaluation request with enhanced security and retention.
    
    Attributes:
        user (ForeignKey): Reference to the buyer user
        raw_requirements (TextField): Original requirements text
        parsed_requirements (JSONField): Structured requirements after AI processing
        status (CharField): Current request status
        matched_vendors (ManyToManyField): Vendors matched to requirements
        proposal_count (IntegerField): Number of received proposals
        expires_at (DateTimeField): When request data should be purged
        matching_criteria (JSONField): Criteria for vendor matching
        min_required_proposals (IntegerField): Minimum proposals needed
        is_anonymized (BooleanField): Whether buyer identity is hidden
        data_sensitivity_level (CharField): Data sensitivity classification
    """
    
    # Core request fields
    user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        help_text="Buyer who created the request"
    )
    
    raw_requirements = models.TextField(
        help_text="Original requirements text input"
    )
    
    parsed_requirements = models.JSONField(
        default=dict,
        help_text="AI-parsed structured requirements"
    )
    
    status = models.CharField(
        max_length=20,
        choices=REQUEST_STATUS_CHOICES,
        default=RequestStatus.DRAFT.value,
        db_index=True,
        help_text="Current request status"
    )
    
    matched_vendors = models.ManyToManyField(
        Vendor,
        blank=True,
        help_text="Vendors matched to requirements"
    )
    
    proposal_count = models.IntegerField(
        default=0,
        help_text="Number of received proposals"
    )
    
    expires_at = models.DateTimeField(
        help_text="When request data should be purged"
    )
    
    matching_criteria = models.JSONField(
        default=dict,
        help_text="Criteria for vendor matching"
    )
    
    min_required_proposals = models.IntegerField(
        default=3,
        help_text="Minimum number of proposals needed"
    )
    
    is_anonymized = models.BooleanField(
        default=True,
        help_text="Whether buyer identity is hidden"
    )
    
    data_sensitivity_level = models.CharField(
        max_length=20,
        choices=[(dc.value, dc.name) for dc in DataClassification],
        default=DataClassification.SENSITIVE.value,
        help_text="Data sensitivity classification"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['expires_at'])
        ]
        verbose_name = 'Request'
        verbose_name_plural = 'Requests'

    def __init__(self, *args, **kwargs):
        """Initialize request with security settings and defaults."""
        super().__init__(*args, **kwargs)
        
        # Set data classification
        self.data_classification = DataClassification.SENSITIVE.value
        
        # Initialize status if new
        if not self.pk and not self.status:
            self.status = RequestStatus.DRAFT.value
            
        # Set default parsed requirements
        if not self.parsed_requirements:
            self.parsed_requirements = {}
            
        # Calculate expiration date
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(
                days=ACTIVE_REQUEST_RETENTION_DAYS
            )
            
        # Set default matching criteria
        if not self.matching_criteria:
            self.matching_criteria = {
                'min_match_score': 0.7,
                'required_capabilities': [],
                'preferred_capabilities': []
            }
            
        # Set default minimum proposals
        if not hasattr(self, 'min_required_proposals'):
            self.min_required_proposals = 3
            
        # Enable anonymization by default
        if not hasattr(self, 'is_anonymized'):
            self.is_anonymized = True
            
        # Set data sensitivity
        if not self.data_sensitivity_level:
            self.data_sensitivity_level = DataClassification.SENSITIVE.value

    def validate_model_specific_classification(self, classification):
        """
        Implement request-specific data classification rules.
        
        Args:
            classification (DataClassification): Classification to validate
            
        Raises:
            ValidationError: If classification is too low for request data
        """
        if classification == DataClassification.PUBLIC:
            raise ValidationError(
                "Request data cannot be classified as public"
            )

    def save(self, *args, **kwargs):
        """
        Override save to validate request data and enforce security policies.
        
        Args:
            **kwargs: Additional arguments passed to save()
            
        Returns:
            Request: Saved request instance
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate user is a buyer
        if not self.user.is_buyer():
            raise ValidationError("Requests can only be created by buyers")
            
        # Clean and sanitize raw requirements
        if self.raw_requirements:
            self.raw_requirements = self.raw_requirements.strip()
            
        # Update proposal count
        self.proposal_count = self.proposals.count()
        
        # Validate data sensitivity
        if self.data_sensitivity_level == DataClassification.PUBLIC.value:
            raise ValidationError("Request data cannot be public")
            
        # Enforce anonymization settings
        if not self.is_anonymized and self.status != RequestStatus.COMPLETED.value:
            raise ValidationError("Buyer identity can only be revealed after completion")
            
        # Update expiration date if status changes
        if self.tracker.has_changed('status'):
            retention_days = (
                COMPLETED_REQUEST_RETENTION_DAYS 
                if self.status == RequestStatus.COMPLETED.value
                else ACTIVE_REQUEST_RETENTION_DAYS
            )
            self.expires_at = timezone.now() + timezone.timedelta(days=retention_days)
            
        # Log save operation
        logger.info(
            f"Saving request {self.pk} for user {self.user.pk} "
            f"with status {self.status}"
        )
        
        return super().save(*args, **kwargs)

    def match_vendors(self):
        """
        Match request with relevant vendors using advanced matching algorithm.
        
        Returns:
            QuerySet: Matched vendor queryset
            
        Raises:
            ValidationError: If matching fails
        """
        # Check cache first
        cache_key = f"request_matches_{self.pk}"
        cached_matches = cache.get(cache_key)
        if cached_matches is not None:
            return Vendor.objects.filter(pk__in=cached_matches)
            
        # Ensure requirements are parsed
        if not self.parsed_requirements:
            raise ValidationError("Requirements must be parsed before matching")
            
        # Get active vendors
        vendors = Vendor.objects.filter(status='active')
        
        # Calculate match scores
        matches = []
        for vendor in vendors:
            score = vendor.match_score(self.parsed_requirements)
            if score >= self.matching_criteria['min_match_score']:
                matches.append({
                    'vendor_id': vendor.pk,
                    'score': score
                })
                
        # Sort by score and get vendor IDs
        matched_ids = [
            m['vendor_id'] 
            for m in sorted(matches, key=lambda x: x['score'], reverse=True)
        ]
        
        # Cache results
        cache.set(cache_key, matched_ids, VENDOR_MATCH_CACHE_TTL)
        
        # Update matched vendors
        matched_vendors = Vendor.objects.filter(pk__in=matched_ids)
        self.matched_vendors.set(matched_vendors)
        
        # Update status if draft
        if self.status == RequestStatus.DRAFT.value:
            self.status = RequestStatus.SUBMITTED.value
            self.save()
            
        return matched_vendors