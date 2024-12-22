"""
Django model mixins providing common functionality for timestamps, data classification, 
and soft deletion across Arena MVP models.

These mixins implement:
- Automatic timestamp tracking
- Data classification with security controls
- Soft deletion with cascade support

Version: 1.0.0
"""

import logging
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from core.constants import DataClassification

# Configure logging
logger = logging.getLogger(__name__)

# Global constants
DEFAULT_DATA_CLASSIFICATION = DataClassification.PUBLIC
SOFT_DELETE_CASCADE_FIELD = 'soft_deleted_by'

class TimestampMixin(models.Model):
    """
    Mixin providing automatic timestamp tracking for model instances.
    
    Attributes:
        created_at (datetime): Timestamp when the instance was created
        updated_at (datetime): Timestamp when the instance was last updated
    """
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def __init__(self, *args, **kwargs):
        """Initialize timestamp fields with current time if not provided."""
        super().__init__(*args, **kwargs)
        if not self.created_at:
            self.created_at = timezone.now()
        if not self.updated_at:
            self.updated_at = timezone.now()

    def save(self, *args, **kwargs):
        """Override save to ensure updated_at is set on every save."""
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

class DataClassificationMixin(models.Model):
    """
    Mixin providing data classification functionality for security controls.
    
    Attributes:
        data_classification (str): Current classification level
        classification_changed_at (datetime): When classification was last changed
        classification_changed_by (str): User who last changed classification
    """
    data_classification = models.CharField(
        max_length=20,
        choices=[(dc.value, dc.name) for dc in DataClassification],
        default=DEFAULT_DATA_CLASSIFICATION.value,
        db_index=True
    )
    classification_changed_at = models.DateTimeField(null=True, blank=True)
    classification_changed_by = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        abstract = True

    def __init__(self, *args, **kwargs):
        """Initialize data classification with default if not provided."""
        super().__init__(*args, **kwargs)
        if not self.data_classification:
            self.data_classification = DEFAULT_DATA_CLASSIFICATION.value

    def validate_data_classification(self):
        """
        Validate the current data classification value.
        
        Returns:
            bool: True if valid, raises ValidationError if invalid
        """
        try:
            # Verify it's a valid DataClassification enum value
            classification = DataClassification(self.data_classification)
            
            # Log validation attempt
            logger.info(
                f"Data classification validation for {self.__class__.__name__} "
                f"id={self.pk}: {classification.name}"
            )
            
            return True
        except ValueError as e:
            logger.error(
                f"Invalid data classification for {self.__class__.__name__} "
                f"id={self.pk}: {self.data_classification}"
            )
            raise ValidationError(
                f"Invalid data classification: {self.data_classification}"
            ) from e

    def change_classification(self, new_classification: DataClassification, changed_by: str):
        """
        Change the data classification with validation and logging.
        
        Args:
            new_classification (DataClassification): New classification level
            changed_by (str): Username of user making the change
            
        Returns:
            bool: True if successful
            
        Raises:
            ValidationError: If new classification is invalid
        """
        previous_classification = self.data_classification
        
        # Set new classification
        self.data_classification = new_classification.value
        
        # Validate new value
        self.validate_data_classification()
        
        # Update tracking fields
        self.classification_changed_at = timezone.now()
        self.classification_changed_by = changed_by
        
        # Log the change
        logger.info(
            f"Data classification changed for {self.__class__.__name__} id={self.pk}: "
            f"{previous_classification} -> {new_classification.value} by {changed_by}"
        )
        
        self.save()
        return True

class SoftDeleteMixin(models.Model):
    """
    Mixin providing soft deletion functionality for data retention.
    
    Attributes:
        deleted_at (datetime): When the instance was soft deleted
        is_deleted (bool): Whether the instance is soft deleted
        deleted_by (str): Username of user who performed the deletion
        soft_deleted_by (ForeignKey): Related model that triggered cascade deletion
    """
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_by = models.CharField(max_length=255, null=True, blank=True)
    soft_deleted_by = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='cascade_deleted_%(class)s'
    )

    class Meta:
        abstract = True

    def delete(self, deleted_by=None, cascade=True, **kwargs):
        """
        Perform soft deletion with optional cascading.
        
        Args:
            deleted_by (str): Username of user performing deletion
            cascade (bool): Whether to cascade deletion to related objects
            **kwargs: Additional arguments passed to save()
            
        Returns:
            tuple: (number_of_objects_deleted, dict_with_number_of_deletions_per_object_type)
        """
        if self.is_deleted:
            return (0, {})
            
        self.deleted_at = timezone.now()
        self.is_deleted = True
        self.deleted_by = deleted_by
        
        # Handle cascade deletion
        deleted_count = 1
        cascade_deleted = {}
        
        if cascade:
            for field in self._meta.get_fields():
                if hasattr(field, 'related_model') and field.related_model:
                    related_objects = getattr(self, field.name).all()
                    for obj in related_objects:
                        if hasattr(obj, 'delete') and hasattr(obj, SOFT_DELETE_CASCADE_FIELD):
                            setattr(obj, SOFT_DELETE_CASCADE_FIELD, self)
                            count, deleted = obj.delete(deleted_by=deleted_by, cascade=True)
                            deleted_count += count
                            cascade_deleted.update(deleted)

        self.save(**kwargs)
        
        logger.info(
            f"Soft deleted {self.__class__.__name__} id={self.pk} "
            f"by {deleted_by} with cascade={cascade}"
        )
        
        return (deleted_count, cascade_deleted)

    def hard_delete(self, **kwargs):
        """
        Perform actual deletion from database.
        
        Returns:
            tuple: (number_of_objects_deleted, dict_with_number_of_deletions_per_object_type)
        """
        logger.warning(
            f"Permanent deletion of {self.__class__.__name__} id={self.pk}"
        )
        return super().delete(**kwargs)

    def restore(self, restored_by=None):
        """
        Restore a soft-deleted object.
        
        Args:
            restored_by (str): Username of user performing restoration
            
        Returns:
            bool: True if restored successfully
        """
        if not self.is_deleted:
            return False
            
        self.deleted_at = None
        self.is_deleted = False
        self.deleted_by = None
        self.soft_deleted_by = None
        
        # Restore cascade-deleted objects
        for field in self._meta.get_fields():
            if hasattr(field, 'related_model') and field.related_model:
                related_objects = getattr(self, field.name).all()
                for obj in related_objects:
                    if (hasattr(obj, 'restore') and 
                        hasattr(obj, SOFT_DELETE_CASCADE_FIELD) and
                        getattr(obj, SOFT_DELETE_CASCADE_FIELD) == self):
                        obj.restore(restored_by=restored_by)
        
        self.save()
        
        logger.info(
            f"Restored {self.__class__.__name__} id={self.pk} by {restored_by}"
        )
        
        return True
```

This implementation provides three key mixins for Django models in the Arena MVP platform:

1. `TimestampMixin`: Handles automatic tracking of creation and update timestamps.
2. `DataClassificationMixin`: Implements data classification with security controls and change tracking.
3. `SoftDeleteMixin`: Provides soft deletion functionality with cascade support and restoration capabilities.

The code follows Django best practices and includes:
- Comprehensive docstrings and comments
- Proper logging for security events and important operations
- Type hints through docstrings
- Validation and error handling
- Cascade operations for related models
- Security controls for data classification
- Audit trail functionality

The mixins can be used by inheriting them in model classes:

```python
class Request(TimestampMixin, DataClassificationMixin, SoftDeleteMixin, models.Model):
    # Request model fields here
    pass