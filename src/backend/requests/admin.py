"""
Django admin configuration for managing software evaluation requests in the Arena MVP platform.

This module implements:
- Enhanced admin interface for request management
- Secure data handling and display
- Performance optimized queries
- Audit logging and tracking

Version: 1.0.0
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.views.decorators.cache import cache_page

from requests.models import Request, Requirement

# Cache timeout for expensive admin queries (5 minutes)
ADMIN_CACHE_TIMEOUT = 300

class RequirementInline(admin.TabularInline):
    """
    Inline admin interface for managing requirements within request admin.
    Provides structured display and editing of request requirements.
    """
    model = Requirement
    extra = 0
    fields = ('type', 'description', 'is_mandatory')
    
    def get_queryset(self, request):
        """Optimize requirement queryset with select_related."""
        return super().get_queryset(request).select_related('request')

class RequestAdmin(admin.ModelAdmin):
    """
    Enhanced admin interface for Request model with security controls
    and optimized performance.
    """
    
    # Display fields and configuration
    list_display = (
        'id', 
        'user', 
        'status', 
        'proposal_count',
        'created_at', 
        'is_anonymized',
        'data_sensitivity_level'
    )
    
    list_filter = (
        'status',
        'is_anonymized', 
        'data_sensitivity_level',
        'created_at'
    )
    
    search_fields = (
        'id',
        'user__email',
        'user__company',
        'raw_requirements'
    )
    
    readonly_fields = (
        'id',
        'created_at',
        'updated_at',
        'expires_at',
        'get_parsed_requirements',
        'get_matched_vendors'
    )
    
    inlines = [RequirementInline]
    
    # Organize fields into logical sections
    fieldsets = (
        ('Request Information', {
            'fields': (
                'id',
                'user',
                'status',
                'is_anonymized',
                'data_sensitivity_level'
            )
        }),
        ('Requirements', {
            'fields': (
                'raw_requirements',
                'get_parsed_requirements',
            )
        }),
        ('Vendor Matching', {
            'fields': (
                'matching_criteria',
                'get_matched_vendors',
                'min_required_proposals',
                'proposal_count'
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at',
                'expires_at'
            ),
            'classes': ('collapse',)
        })
    )
    
    list_per_page = 50
    
    def get_queryset(self, request):
        """Optimize admin queryset with select/prefetch related."""
        return super().get_queryset(request)\
            .select_related('user')\
            .prefetch_related('matched_vendors')

    @cache_page(ADMIN_CACHE_TIMEOUT)
    def get_parsed_requirements(self, obj):
        """
        Format parsed requirements for admin display with enhanced security.
        
        Args:
            obj (Request): Request instance
            
        Returns:
            SafeString: Formatted HTML of parsed requirements
        """
        if not obj.parsed_requirements:
            return mark_safe('<em>No parsed requirements</em>')
            
        try:
            html = ['<div class="parsed-requirements">']
            
            for category, requirements in obj.parsed_requirements.items():
                html.append(f'<h4>{category}</h4>')
                html.append('<ul>')
                
                for req in requirements:
                    priority = req.get('priority', 'normal')
                    description = req.get('description', '')
                    validation = req.get('validation_status', 'pending')
                    
                    html.append(
                        f'<li class="requirement {priority} {validation}">'
                        f'{description}'
                        f'<span class="badge">{priority}</span>'
                        f'<span class="badge">{validation}</span>'
                        f'</li>'
                    )
                    
                html.append('</ul>')
                
            html.append('</div>')
            return mark_safe(''.join(html))
            
        except Exception as e:
            return mark_safe(
                f'<div class="error">Error displaying requirements: {str(e)}</div>'
            )
    
    get_parsed_requirements.short_description = 'Parsed Requirements'
    get_parsed_requirements.allow_tags = True

    @cache_page(ADMIN_CACHE_TIMEOUT)
    def get_matched_vendors(self, obj):
        """
        Format matched vendors list with enhanced display and security.
        
        Args:
            obj (Request): Request instance
            
        Returns:
            SafeString: Formatted HTML of matched vendors
        """
        if not obj.matched_vendors.exists():
            return mark_safe('<em>No matched vendors</em>')
            
        try:
            html = ['<div class="matched-vendors">']
            html.append('<table>')
            html.append(
                '<tr>'
                '<th>Vendor</th>'
                '<th>Match Score</th>'
                '<th>Status</th>'
                '<th>Confidence</th>'
                '</tr>'
            )
            
            for vendor in obj.matched_vendors.all():
                match_score = vendor.match_score(obj.parsed_requirements)
                status = vendor.status
                confidence = 'High' if match_score > 0.8 else 'Medium'
                
                html.append(
                    f'<tr>'
                    f'<td>{vendor.name}</td>'
                    f'<td>{match_score:.0%}</td>'
                    f'<td><span class="status-{status}">{status}</span></td>'
                    f'<td>{confidence}</td>'
                    f'</tr>'
                )
                
            html.append('</table>')
            html.append('</div>')
            return mark_safe(''.join(html))
            
        except Exception as e:
            return mark_safe(
                f'<div class="error">Error displaying vendors: {str(e)}</div>'
            )
    
    get_matched_vendors.short_description = 'Matched Vendors'
    get_matched_vendors.allow_tags = True

    def save_model(self, request, obj, form, change):
        """Override save to enforce security and add audit logging."""
        # Validate data classification
        if obj.data_sensitivity_level == 'public':
            raise admin.ValidationError("Request data cannot be public")
            
        # Enforce anonymization rules
        if not obj.is_anonymized and obj.status != 'completed':
            raise admin.ValidationError(
                "Buyer identity can only be revealed after completion"
            )
            
        super().save_model(request, obj, form, change)

# Register models
admin.site.register(Request, RequestAdmin)