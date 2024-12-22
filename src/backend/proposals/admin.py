"""
Django admin configuration for managing proposals and proposal documents with enhanced security,
auditing and usability features.

Version: 1.0.0
"""

import logging
from django.contrib import admin
from django.contrib.admin.models import LogEntry
from django.contrib import messages
from django.utils import timezone
from django.core.exceptions import ValidationError

from proposals.models import Proposal, ProposalDocument
from core.constants import DataClassification, ProposalStatus

# Configure logging
logger = logging.getLogger(__name__)

class ProposalDocumentInline(admin.TabularInline):
    """
    Enhanced inline admin interface for managing proposal documents with security controls.
    """
    model = ProposalDocument
    extra = 0
    max_num = 10
    
    fields = ('title', 'document_type', 'file_path', 'file_size', 'created_at', 'last_modified_by')
    readonly_fields = ('file_size', 'created_at', 'last_modified_by')
    
    def has_delete_permission(self, request, obj=None):
        """Control document deletion based on proposal status."""
        if not obj or not obj.proposal:
            return False
            
        # Prevent deletion for accepted/rejected proposals
        if obj.proposal.status in [ProposalStatus.ACCEPTED.value, ProposalStatus.REJECTED.value]:
            return False
            
        # Log deletion attempt
        logger.info(
            f"Document deletion attempted by {request.user} "
            f"for proposal {obj.proposal.id}"
        )
        
        return True
        
    def has_add_permission(self, request, obj=None):
        """Control document addition based on proposal status."""
        if not obj:
            return True
            
        # Prevent adding documents to finalized proposals
        if obj.status in [ProposalStatus.ACCEPTED.value, ProposalStatus.REJECTED.value]:
            return False
            
        return True

@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    """
    Enhanced admin interface for managing proposals with security and audit features.
    """
    
    # Display configuration
    list_display = (
        'id', 
        'vendor_name',
        'request_id', 
        'status',
        'document_count',
        'created_at',
        'data_classification'
    )
    
    list_filter = (
        'status',
        'created_at',
        'data_classification',
        'is_deleted'
    )
    
    search_fields = (
        'id',
        'vendor__name',
        'request__id'
    )
    
    readonly_fields = (
        'id',
        'created_at',
        'updated_at',
        'last_modified_by',
        'data_classification'
    )
    
    fieldsets = (
        ('Overview', {
            'fields': (
                'id',
                'vendor',
                'request',
                'status'
            )
        }),
        ('Proposal Details', {
            'fields': (
                'pricing_details',
                'vendor_pitch',
                'feature_matrix',
                'implementation_time_weeks'
            )
        }),
        ('Security & Audit', {
            'fields': (
                'data_classification',
                'created_at',
                'updated_at',
                'last_modified_by'
            ),
            'classes': ('collapse',)
        })
    )
    
    inlines = [ProposalDocumentInline]
    
    actions = [
        'mark_accepted',
        'mark_rejected',
        'export_proposals'
    ]
    
    def get_queryset(self, request):
        """Override queryset with security filtering and optimizations."""
        qs = super().get_queryset(request)
        
        # Add select_related for performance
        qs = qs.select_related('vendor', 'request')
        
        # Filter based on user role
        if not request.user.is_arena_staff():
            qs = qs.filter(data_classification__in=[
                DataClassification.SENSITIVE.value,
                DataClassification.PUBLIC.value
            ])
            
        return qs
        
    def vendor_name(self, obj):
        """Display vendor name with security check."""
        return obj.vendor.name if obj.vendor else 'N/A'
    vendor_name.short_description = 'Vendor'
    
    def request_id(self, obj):
        """Display request ID with security check."""
        return obj.request.id if obj.request else 'N/A'
    request_id.short_description = 'Request ID'
    
    def document_count(self, obj):
        """Display count of attached documents."""
        return obj.documents.count()
    document_count.short_description = 'Documents'
    
    def save_model(self, request, obj, form, change):
        """Enhanced save with audit logging."""
        try:
            # Set last modified by
            obj.last_modified_by = request.user.email
            
            # Validate data classification
            if obj.data_classification == DataClassification.PUBLIC.value:
                raise ValidationError("Proposals cannot be classified as public")
                
            # Log the change
            logger.info(
                f"Proposal {obj.id} modified by {request.user.email}: "
                f"Status={obj.status}"
            )
            
            super().save_model(request, obj, form, change)
            
            # Create admin log entry
            LogEntry.objects.log_action(
                user_id=request.user.id,
                content_type_id=self.model._meta.app_label,
                object_id=obj.id,
                object_repr=str(obj),
                action_flag=change and 2 or 1,
                change_message=f"Modified proposal {obj.id}"
            )
            
        except Exception as e:
            logger.error(f"Error saving proposal {obj.id}: {str(e)}")
            messages.error(request, f"Error saving proposal: {str(e)}")
            raise
            
    def mark_accepted(self, request, queryset):
        """Bulk action to mark proposals as accepted."""
        updated = 0
        for proposal in queryset:
            if proposal.status != ProposalStatus.ACCEPTED.value:
                proposal.status = ProposalStatus.ACCEPTED.value
                proposal.save()
                updated += 1
                
        self.message_user(
            request,
            f"{updated} proposal(s) marked as accepted"
        )
    mark_accepted.short_description = "Mark selected proposals as accepted"
    
    def mark_rejected(self, request, queryset):
        """Bulk action to mark proposals as rejected."""
        updated = 0
        for proposal in queryset:
            if proposal.status != ProposalStatus.REJECTED.value:
                proposal.status = ProposalStatus.REJECTED.value
                proposal.save()
                updated += 1
                
        self.message_user(
            request,
            f"{updated} proposal(s) marked as rejected"
        )
    mark_rejected.short_description = "Mark selected proposals as rejected"
    
    def export_proposals(self, request, queryset):
        """Export selected proposals with security checks."""
        if not request.user.is_arena_staff():
            messages.error(request, "Only staff can export proposals")
            return
            
        # Implementation for secure proposal export would go here
        self.message_user(request, "Proposal export not implemented")
    export_proposals.short_description = "Export selected proposals"

# Customize admin site
admin.site.site_header = 'Arena Proposal Management'
admin.site.site_title = 'Arena Admin'
admin.site.index_title = 'Proposal Administration'