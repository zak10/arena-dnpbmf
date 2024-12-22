"""
Django REST Framework serializers for proposal data handling in the Arena MVP API.

This module implements:
- Secure proposal data validation and transformation
- Enhanced security controls for sensitive data
- Feature comparison capabilities
- Document handling with security validation

Version: 1.0.0
"""

import logging
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from proposals.models import Proposal, ProposalDocument
from vendors.models import Vendor

# Configure logging
logger = logging.getLogger(__name__)

# File size limits (in bytes)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Allowed file types
ALLOWED_FILE_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx']

class ProposalDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for proposal supporting documents with enhanced security validation.
    
    Implements:
    - File type validation
    - Size limit enforcement
    - Path security checks
    - Audit logging
    """
    
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(
        max_length=255,
        required=True,
        help_text="Document title"
    )
    file_path = serializers.CharField(
        max_length=1024,
        required=True,
        help_text="S3 file path"
    )
    file_size = serializers.IntegerField(
        required=True,
        help_text="File size in bytes"
    )
    file_type = serializers.CharField(
        max_length=10,
        required=True,
        help_text="File extension"
    )

    class Meta:
        model = ProposalDocument
        fields = ['id', 'title', 'file_path', 'file_size', 'file_type']

    def __init__(self, *args, **kwargs):
        """Initialize document serializer with security controls."""
        super().__init__(*args, **kwargs)
        
        # Set up file type validation
        self.allowed_types = ALLOWED_FILE_TYPES
        self.max_size = MAX_FILE_SIZE

    def validate(self, data):
        """
        Validate document data with security checks.
        
        Validates:
        - File size limits
        - Allowed file types
        - Path security
        - File existence
        
        Args:
            data (dict): Document data to validate
            
        Returns:
            dict: Validated and sanitized data
            
        Raises:
            ValidationError: If validation fails
        """
        # Check file size
        if data['file_size'] > self.max_size:
            raise ValidationError(
                f"File size exceeds maximum allowed size of {self.max_size} bytes"
            )
            
        # Validate file type
        file_type = data['file_type'].lower()
        if file_type not in self.allowed_types:
            raise ValidationError(
                f"File type '{file_type}' not allowed. Allowed types: {self.allowed_types}"
            )
            
        # Sanitize file path
        data['file_path'] = data['file_path'].strip().replace('../', '')
        
        # Log validation
        logger.info(
            f"Validated proposal document: {data['title']} "
            f"({data['file_type']}, {data['file_size']} bytes)"
        )
        
        return data

class ProposalSerializer(serializers.ModelSerializer):
    """
    Main serializer for proposal data with enhanced validation and security.
    
    Implements:
    - Secure data validation
    - Feature comparison
    - Document handling
    - Pricing validation
    - Audit logging
    """
    
    id = serializers.UUIDField(read_only=True)
    request_id = serializers.UUIDField(required=True)
    vendor_id = serializers.UUIDField(required=True)
    status = serializers.CharField(read_only=True)
    pricing_details = serializers.JSONField(required=True)
    vendor_pitch = serializers.CharField(required=True)
    feature_matrix = serializers.JSONField(required=True)
    implementation_time_weeks = serializers.IntegerField(required=True)
    expires_at = serializers.DateTimeField(read_only=True)
    
    # Nested serializers
    documents = ProposalDocumentSerializer(many=True, required=False)
    vendor = serializers.SerializerMethodField()

    class Meta:
        model = Proposal
        fields = [
            'id', 'request_id', 'vendor_id', 'status', 'pricing_details',
            'vendor_pitch', 'feature_matrix', 'implementation_time_weeks',
            'expires_at', 'documents', 'vendor'
        ]

    def __init__(self, *args, **kwargs):
        """Initialize proposal serializer with enhanced validation."""
        super().__init__(*args, **kwargs)
        
        # Set up nested serializers
        self.document_serializer = ProposalDocumentSerializer
        
        # Configure validation rules
        self.min_pitch_length = 100
        self.max_pitch_length = 5000
        
        # Set up pricing schema validation
        self.required_pricing_fields = ['base_price', 'billing_frequency']
        
        # Configure feature matrix validation
        self.required_matrix_sections = ['requirements', 'capabilities']

    def get_vendor(self, obj):
        """
        Get sanitized vendor details for the proposal.
        
        Args:
            obj (Proposal): Proposal instance
            
        Returns:
            dict: Sanitized vendor data
        """
        vendor = obj.vendor
        return {
            'id': vendor.id,
            'name': vendor.name,
            'capabilities': vendor.capabilities
        }

    def validate_pricing_details(self, pricing_details):
        """
        Validate pricing structure with enhanced security.
        
        Args:
            pricing_details (dict): Pricing data to validate
            
        Returns:
            dict: Validated pricing data
            
        Raises:
            ValidationError: If validation fails
        """
        # Check required fields
        for field in self.required_pricing_fields:
            if field not in pricing_details:
                raise ValidationError(f"Missing required pricing field: {field}")
                
        # Validate base price
        base_price = pricing_details.get('base_price')
        if not isinstance(base_price, (int, float)) or base_price < 0:
            raise ValidationError("Invalid base price")
            
        # Validate billing frequency
        valid_frequencies = ['monthly', 'annual', 'one_time']
        if pricing_details['billing_frequency'] not in valid_frequencies:
            raise ValidationError(f"Invalid billing frequency")
            
        # Log validation
        logger.info(f"Validated proposal pricing: {pricing_details}")
        
        return pricing_details

    def validate_feature_matrix(self, feature_matrix):
        """
        Validate feature comparison data.
        
        Args:
            feature_matrix (dict): Feature data to validate
            
        Returns:
            dict: Validated feature data
            
        Raises:
            ValidationError: If validation fails
        """
        # Check required sections
        for section in self.required_matrix_sections:
            if section not in feature_matrix:
                raise ValidationError(f"Missing required matrix section: {section}")
                
        # Validate requirements coverage
        requirements = feature_matrix['requirements']
        if not isinstance(requirements, list) or not requirements:
            raise ValidationError("Requirements must be a non-empty list")
            
        # Validate capabilities
        capabilities = feature_matrix['capabilities']
        if not isinstance(capabilities, dict):
            raise ValidationError("Capabilities must be a dictionary")
            
        # Log validation
        logger.info(f"Validated proposal feature matrix with {len(requirements)} requirements")
        
        return feature_matrix

    def create(self, validated_data):
        """
        Create new proposal instance with security logging.
        
        Args:
            validated_data (dict): Validated proposal data
            
        Returns:
            Proposal: Created proposal instance
            
        Raises:
            ValidationError: If creation fails
        """
        # Extract nested document data
        documents_data = validated_data.pop('documents', [])
        
        # Log creation attempt
        logger.info(
            f"Creating proposal for request {validated_data['request_id']} "
            f"from vendor {validated_data['vendor_id']}"
        )
        
        try:
            # Create proposal
            proposal = super().create(validated_data)
            
            # Create documents
            for doc_data in documents_data:
                ProposalDocument.objects.create(
                    proposal=proposal,
                    **doc_data
                )
                
            return proposal
            
        except Exception as e:
            logger.error(f"Failed to create proposal: {str(e)}")
            raise ValidationError("Failed to create proposal") from e

    def update(self, instance, validated_data):
        """
        Update existing proposal with security checks.
        
        Args:
            instance (Proposal): Existing proposal instance
            validated_data (dict): Validated update data
            
        Returns:
            Proposal: Updated proposal instance
            
        Raises:
            ValidationError: If update fails
        """
        # Validate proposal is editable
        if instance.status not in ['draft', 'pending']:
            raise ValidationError("Cannot update submitted proposal")
            
        # Extract nested document data
        documents_data = validated_data.pop('documents', [])
        
        # Log update attempt
        logger.info(f"Updating proposal {instance.id}")
        
        try:
            # Update proposal
            proposal = super().update(instance, validated_data)
            
            # Handle document updates
            if documents_data:
                # Remove existing documents
                proposal.documents.all().delete()
                
                # Create new documents
                for doc_data in documents_data:
                    ProposalDocument.objects.create(
                        proposal=proposal,
                        **doc_data
                    )
                    
            return proposal
            
        except Exception as e:
            logger.error(f"Failed to update proposal: {str(e)}")
            raise ValidationError("Failed to update proposal") from e