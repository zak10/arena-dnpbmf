"""
API serializers for handling software evaluation request data validation, transformation 
and representation in the Arena MVP platform with enhanced security and validation features.

Version: 1.0.0
"""

import logging
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.db import transaction

from requests.models import Request
from core.utils.validators import (
    validate_text_input,
    validate_file_upload,
    DataValidator
)
from core.constants import DataClassification, RequestStatus

# Configure logging
logger = logging.getLogger(__name__)

# Constants
MAX_REQUIREMENTS_LENGTH = 10000
ALLOWED_REQUIREMENT_TYPES = ['functional', 'technical', 'security', 'compliance']
MAX_FILE_SIZE_MB = 10

class RequirementSerializer(serializers.Serializer):
    """
    Enhanced serializer for individual parsed requirements with security validation.
    """
    id = serializers.UUIDField(read_only=True)
    type = serializers.CharField(max_length=50)
    description = serializers.CharField(max_length=1000)
    is_mandatory = serializers.BooleanField(default=True)
    data_classification = serializers.CharField(max_length=50)

    def __init__(self, *args, **kwargs):
        """Initialize requirement serializer with enhanced validation."""
        super().__init__(*args, **kwargs)
        self.data_validator = DataValidator(
            classification_level=DataClassification.SENSITIVE,
            custom_rules={
                'type': lambda x: x.lower() in ALLOWED_REQUIREMENT_TYPES,
                'description': lambda x: len(x.strip()) >= 10
            }
        )

    def validate_description(self, value):
        """
        Validate requirement description with security checks.
        
        Args:
            value: Description text to validate
            
        Returns:
            Validated and sanitized description
            
        Raises:
            ValidationError: If validation fails
        """
        try:
            validate_text_input(
                text=value,
                max_length=1000,
                required=True,
                custom_rules={'min_length': lambda x: len(x.strip()) >= 10}
            )
            return value.strip()
        except ValidationError as e:
            logger.error(f"Requirement description validation failed: {str(e)}")
            raise serializers.ValidationError(str(e))

    def validate_type(self, value):
        """
        Validate requirement type against allowed values.
        
        Args:
            value: Requirement type to validate
            
        Returns:
            Validated type
            
        Raises:
            ValidationError: If validation fails
        """
        type_lower = value.lower()
        if type_lower not in ALLOWED_REQUIREMENT_TYPES:
            raise serializers.ValidationError(
                f"Invalid requirement type. Allowed types: {', '.join(ALLOWED_REQUIREMENT_TYPES)}"
            )
        return type_lower

class RequestSerializer(serializers.ModelSerializer):
    """
    Enhanced main serializer for software evaluation requests with security features.
    """
    id = serializers.UUIDField(read_only=True)
    raw_requirements = serializers.CharField(
        max_length=MAX_REQUIREMENTS_LENGTH,
        required=True,
        write_only=True
    )
    parsed_requirements = serializers.JSONField(read_only=True)
    status = serializers.ChoiceField(
        choices=[(s.value, s.name) for s in RequestStatus],
        default=RequestStatus.DRAFT.value
    )
    documents = serializers.ListField(
        child=serializers.FileField(max_length=255),
        required=False,
        write_only=True
    )
    created_at = serializers.DateTimeField(read_only=True)
    security_classification = serializers.ChoiceField(
        choices=[(dc.value, dc.name) for dc in DataClassification],
        default=DataClassification.SENSITIVE.value
    )

    class Meta:
        model = Request
        fields = [
            'id', 'raw_requirements', 'parsed_requirements', 'status',
            'documents', 'created_at', 'security_classification'
        ]
        read_only_fields = ['id', 'parsed_requirements', 'created_at']

    def __init__(self, *args, **kwargs):
        """Initialize request serializer with enhanced security."""
        super().__init__(*args, **kwargs)
        self.data_validator = DataValidator(
            classification_level=DataClassification.SENSITIVE
        )

    def validate_raw_requirements(self, value):
        """
        Enhanced validation for raw requirements text.
        
        Args:
            value: Raw requirements text to validate
            
        Returns:
            Validated requirements text
            
        Raises:
            ValidationError: If validation fails
        """
        try:
            validate_text_input(
                text=value,
                max_length=MAX_REQUIREMENTS_LENGTH,
                required=True
            )
            return value.strip()
        except ValidationError as e:
            logger.error(f"Raw requirements validation failed: {str(e)}")
            raise serializers.ValidationError(str(e))

    def validate_documents(self, files):
        """
        Enhanced document validation with security checks.
        
        Args:
            files: List of uploaded files to validate
            
        Returns:
            Validated file list
            
        Raises:
            ValidationError: If validation fails
        """
        if not files:
            return []

        validated_files = []
        for file in files:
            try:
                validate_file_upload(file)
                validated_files.append(file)
            except ValidationError as e:
                logger.error(f"File validation failed: {str(e)}")
                raise serializers.ValidationError(str(e))

        return validated_files

    @transaction.atomic
    def create(self, validated_data):
        """
        Create new request instance with security controls.
        
        Args:
            validated_data: Validated request data
            
        Returns:
            Created request instance
            
        Raises:
            ValidationError: If creation fails
        """
        try:
            # Extract and remove documents from validated data
            documents = validated_data.pop('documents', [])

            # Set security classification
            validated_data['data_classification'] = DataClassification.SENSITIVE.value

            # Create request instance
            request = Request.objects.create(**validated_data)

            # Process documents if any
            for document in documents:
                # Document handling would be implemented here
                pass

            logger.info(f"Created request {request.id} with {len(documents)} documents")
            return request

        except Exception as e:
            logger.error(f"Request creation failed: {str(e)}")
            raise serializers.ValidationError("Failed to create request")

    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Update request instance with security validation.
        
        Args:
            instance: Existing request instance
            validated_data: Validated update data
            
        Returns:
            Updated request instance
            
        Raises:
            ValidationError: If update fails
        """
        try:
            # Validate request status
            if instance.status != RequestStatus.DRAFT.value:
                raise serializers.ValidationError(
                    "Only draft requests can be updated"
                )

            # Extract and remove documents from validated data
            documents = validated_data.pop('documents', [])

            # Update request fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            # Process new documents if any
            for document in documents:
                # Document handling would be implemented here
                pass

            instance.save()
            logger.info(f"Updated request {instance.id}")
            return instance

        except Exception as e:
            logger.error(f"Request update failed: {str(e)}")
            raise serializers.ValidationError("Failed to update request")