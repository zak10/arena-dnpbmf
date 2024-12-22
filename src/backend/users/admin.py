"""
Django admin configuration for user management in Arena MVP.
Implements secure admin interface with role-based access control and comprehensive audit logging.

Version: 1.0.0
"""

from django.contrib import admin  # v4.2+
from django.contrib.auth.admin import UserAdmin  # v4.2+
from django.contrib import messages
from django.utils import timezone
from django.db.models import Q
from django.core.exceptions import ValidationError

from users.models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Enhanced admin configuration for User model with comprehensive security controls 
    and audit logging.
    """
    
    # Display fields in list view
    list_display = [
        'email', 
        'role', 
        'full_name', 
        'company', 
        'is_active',
        'is_staff',
        'last_login',
        'created_at',
        'get_last_modified'
    ]
    
    # Filtering options
    list_filter = [
        'role',
        'is_active',
        'is_staff',
        'created_at',
        'last_login',
        ('data_classification', admin.ChoicesFieldListFilter),
    ]
    
    # Search configuration
    search_fields = [
        'email',
        'full_name',
        'company'
    ]
    
    # Default ordering
    ordering = ['-created_at']
    
    # Read-only fields for security
    readonly_fields = [
        'last_login',
        'created_at',
        'updated_at',
        'deleted_at',
        'deleted_by',
        'classification_changed_at',
        'classification_changed_by'
    ]
    
    # Form layout configuration
    fieldsets = [
        ('User Information', {
            'fields': [
                'email',
                'full_name',
                'company',
                'password'
            ]
        }),
        ('Permissions', {
            'fields': [
                'role',
                'is_active',
                'is_staff',
                'data_classification'
            ],
            'classes': ['collapse']
        }),
        ('Audit Information', {
            'fields': [
                'last_login',
                'created_at',
                'updated_at',
                'classification_changed_at',
                'classification_changed_by',
                'deleted_at',
                'deleted_by'
            ],
            'classes': ['collapse']
        })
    ]
    
    # Fields for adding new users
    add_fieldsets = [
        ('User Information', {
            'fields': [
                'email',
                'full_name',
                'company',
                'password1',
                'password2'
            ]
        }),
        ('Role & Permissions', {
            'fields': [
                'role',
                'is_active',
                'is_staff'
            ]
        })
    ]

    def get_queryset(self, request):
        """
        Override queryset to exclude deleted users and apply role-based filtering.
        
        Args:
            request (HttpRequest): Current request
            
        Returns:
            QuerySet: Filtered user queryset
        """
        qs = super().get_queryset(request)
        
        # Exclude soft-deleted users
        qs = qs.filter(is_deleted=False)
        
        # Apply role-based filtering for non-superusers
        if not request.user.is_superuser:
            if request.user.is_arena_staff():
                # Staff can see buyers but not other staff
                qs = qs.filter(Q(role='buyer') | Q(id=request.user.id))
            else:
                # Buyers can only see themselves
                qs = qs.filter(id=request.user.id)
                
        return qs

    def get_last_modified(self, obj):
        """
        Format last modification information for display.
        
        Args:
            obj (User): User instance
            
        Returns:
            str: Formatted last modified info
        """
        return f"{obj.updated_at.strftime('%Y-%m-%d %H:%M:%S')}"
    get_last_modified.short_description = 'Last Modified'
    get_last_modified.admin_order_field = 'updated_at'

    def has_delete_permission(self, request, obj=None):
        """
        Override delete permission to prevent permanent deletion.
        Soft deletion should be used instead.
        
        Returns:
            bool: False to prevent permanent deletion
        """
        return False

    def save_model(self, request, obj, form, change):
        """
        Override save to track modifications and validate changes.
        
        Args:
            request (HttpRequest): Current request
            obj (User): User instance being saved
            form (ModelForm): Form instance
            change (bool): Whether this is a change or new instance
        """
        try:
            # Validate data classification
            if not change:  # New user
                obj.data_classification = 'highly_sensitive'
            
            # Track modification metadata
            obj.updated_at = timezone.now()
            
            if change and form.changed_data:
                # Log changes for audit trail
                changes = ', '.join(form.changed_data)
                self.message_user(
                    request,
                    f"Modified fields: {changes}",
                    messages.INFO
                )
            
            super().save_model(request, obj, form, change)
            
        except ValidationError as e:
            self.message_user(request, str(e), messages.ERROR)
            raise

    def response_change(self, request, obj):
        """
        Override response after changes to show success/error messages.
        
        Args:
            request (HttpRequest): Current request
            obj (User): Modified user instance
            
        Returns:
            HttpResponse: Response with appropriate messages
        """
        response = super().response_change(request, obj)
        
        if not obj.is_active:
            self.message_user(
                request,
                f"User {obj.email} has been deactivated",
                messages.WARNING
            )
            
        return response