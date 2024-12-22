"""
Django admin configuration for managing vendor data in the Arena MVP platform.

This module implements:
- Enhanced admin interface for vendor management
- Security controls and data classification
- Field-level permissions and validation
- Audit logging and history tracking

Version: 1.0.0
"""

import logging
from django.contrib import admin
from django.contrib import messages
from django.utils.html import format_html
from django_json_widget.widgets import JSONEditorWidget

from vendors.models import Vendor
from core.constants import DataClassification

# Configure logging
logger = logging.getLogger(__name__)

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    """
    Enhanced admin interface for managing vendor data with security controls.
    """
    
    # List display configuration
    list_display = [
        'id', 
        'name', 
        'website',
        'status',
        'data_classification_badge',
        'last_verified_at',
        'created_at',
        'updated_at'
    ]
    
    # Filtering and search
    list_filter = [
        'status',
        'data_classification',
        'last_verified_at',
        'created_at'
    ]
    
    search_fields = [
        'name',
        'website',
        'description',
        'capabilities'
    ]
    
    # Default ordering
    ordering = ['-created_at']
    
    # Base readonly fields
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
        'last_verified_at'
    ]
    
    # Custom admin actions
    actions = [
        'activate_vendors',
        'deactivate_vendors',
        'archive_vendors'
    ]

    def get_readonly_fields(self, request, obj=None):
        """
        Define readonly fields based on user permissions and security level.
        """
        readonly = list(self.readonly_fields)
        
        # Only superusers can modify data classification
        if not request.user.is_superuser:
            readonly.append('data_classification')
            
        # Prevent modification of archived vendors
        if obj and obj.status == 'archived':
            readonly.extend([
                'name',
                'website',
                'capabilities',
                'status'
            ])
            
        return readonly

    def get_fieldsets(self, request, obj=None):
        """
        Define secure form fieldsets with enhanced organization.
        """
        return (
            ('Basic Information', {
                'fields': (
                    'id',
                    'name',
                    'website',
                    'description',
                    'status'
                )
            }),
            ('Security Classification', {
                'fields': (
                    'data_classification',
                ),
                'classes': ('collapse',),
                'description': 'Security controls and data protection level'
            }),
            ('Capabilities', {
                'fields': (
                    'capabilities',
                    'capabilities_version'
                ),
                'classes': ('collapse',),
                'description': 'Vendor capabilities and feature matrix'
            }),
            ('Audit Information', {
                'fields': (
                    'last_verified_at',
                    'created_at',
                    'updated_at'
                ),
                'classes': ('collapse',),
                'description': 'System audit trail and timestamps'
            })
        )

    def formfield_for_dbfield(self, db_field, **kwargs):
        """
        Customize form fields with enhanced widgets and validation.
        """
        formfield = super().formfield_for_dbfield(db_field, **kwargs)
        
        # Use JSON editor for capabilities
        if db_field.name == 'capabilities':
            formfield.widget = JSONEditorWidget(
                options={
                    'modes': ['tree', 'code'],
                    'search': True,
                    'history': True
                }
            )
            
        return formfield

    def data_classification_badge(self, obj):
        """
        Display data classification with color-coded badge.
        """
        colors = {
            DataClassification.HIGHLY_SENSITIVE.value: 'red',
            DataClassification.SENSITIVE.value: 'orange',
            DataClassification.PUBLIC.value: 'green'
        }
        
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(obj.data_classification, 'gray'),
            obj.data_classification
        )
    data_classification_badge.short_description = 'Classification'
    data_classification_badge.admin_order_field = 'data_classification'

    def save_model(self, request, obj, form, change):
        """
        Enhanced save method with security checks and logging.
        """
        try:
            # Validate data classification
            obj.validate_classification()
            
            # Track classification changes
            if change and 'data_classification' in form.changed_data:
                obj.classification_changed_by = request.user.username
                
            # Log the save operation
            logger.info(
                f"Vendor {obj.pk} saved by {request.user.username} "
                f"with classification {obj.data_classification}"
            )
            
            super().save_model(request, obj, form, change)
            
        except Exception as e:
            logger.error(f"Error saving vendor {obj.pk}: {str(e)}")
            messages.error(request, f"Error saving vendor: {str(e)}")
            raise

    @admin.action(description="Activate selected vendors")
    def activate_vendors(self, request, queryset):
        """Activate multiple vendors with validation."""
        activated = 0
        for vendor in queryset:
            try:
                vendor.activate()
                activated += 1
            except Exception as e:
                messages.error(request, f"Error activating {vendor.name}: {str(e)}")
                
        messages.success(request, f"Successfully activated {activated} vendors")

    @admin.action(description="Deactivate selected vendors")
    def deactivate_vendors(self, request, queryset):
        """Deactivate multiple vendors."""
        deactivated = 0
        for vendor in queryset:
            try:
                vendor.deactivate("Bulk deactivation via admin")
                deactivated += 1
            except Exception as e:
                messages.error(request, f"Error deactivating {vendor.name}: {str(e)}")
                
        messages.success(request, f"Successfully deactivated {deactivated} vendors")

    @admin.action(description="Archive selected vendors")
    def archive_vendors(self, request, queryset):
        """Archive multiple vendors."""
        archived = 0
        for vendor in queryset:
            try:
                vendor.archive()
                archived += 1
            except Exception as e:
                messages.error(request, f"Error archiving {vendor.name}: {str(e)}")
                
        messages.success(request, f"Successfully archived {archived} vendors")