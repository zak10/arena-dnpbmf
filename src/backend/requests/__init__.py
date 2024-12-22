"""
Package initialization for the Arena MVP requests module.

This module implements secure request management with:
- Enhanced data classification controls
- Security validation and monitoring
- Anonymous vendor evaluation
- AI-powered requirement parsing

Version: 1.0.0
"""

from requests.models import Request, RequestDocument, Requirement
from requests.services import RequestService

# Package version
__version__ = '1.0.0'

# Export public interface with enhanced security controls
__all__ = [
    # Core request model with security enhancements
    'Request',
    
    # Document handling with validation
    'RequestDocument',
    
    # Requirement parsing and tracking
    'Requirement',
    
    # Service layer with security controls
    'RequestService'
]

# Initialize request service with security context
request_service = RequestService()

# Configure default data classification
DEFAULT_DATA_CLASSIFICATION = 'sensitive'

# Configure security controls
SECURITY_CONTROLS = {
    'anonymization_enabled': True,
    'data_classification_required': True,
    'input_validation_required': True,
    'audit_logging_enabled': True
}

# Configure request retention periods (in days)
RETENTION_PERIODS = {
    'active_requests': 365,    # 1 year
    'completed_requests': 730,  # 2 years
    'archived_requests': 2555   # 7 years (audit requirement)
}

# Configure performance thresholds (in seconds)
PERFORMANCE_THRESHOLDS = {
    'request_processing': 5.0,
    'ai_parsing': 10.0,
    'vendor_matching': 3.0
}

def get_request_service() -> RequestService:
    """
    Get configured request service instance with security controls.

    Returns:
        RequestService: Configured service instance
    """
    return request_service

def validate_security_controls() -> bool:
    """
    Validate that required security controls are enabled.

    Returns:
        bool: True if all required controls are enabled
    """
    return all([
        SECURITY_CONTROLS['anonymization_enabled'],
        SECURITY_CONTROLS['data_classification_required'],
        SECURITY_CONTROLS['input_validation_required'],
        SECURITY_CONTROLS['audit_logging_enabled']
    ])