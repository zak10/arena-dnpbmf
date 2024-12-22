"""
Core module initialization for Arena MVP platform.

This module configures Django application settings, exports essential components,
and implements robust data classification and security controls.

Version: 1.0.0
"""

# Django 4.2+ application configuration
from django.apps import default_app_config  # v4.2+

# Import core application configuration and enums
from core.apps import CoreConfig
from core.constants import (
    DataClassification,
    RequestStatus,
    ProposalStatus
)

# Set default Django application configuration
default_app_config = 'core.apps.CoreConfig'

# Package version
__version__ = '1.0.0'

# Export essential enums and constants for use across the application
__all__ = [
    'DataClassification',  # Data classification levels with security controls
    'RequestStatus',       # Request lifecycle status states
    'ProposalStatus',     # Proposal lifecycle status states
]

# Initialize data classification security controls
data_classification_config = {
    DataClassification.HIGHLY_SENSITIVE.value: {
        'encryption': 'AES-256',
        'access_control': 'strict',
        'audit_logging': True,
        'field_level_encryption': True
    },
    DataClassification.SENSITIVE.value: {
        'encryption': 'AES-256',
        'access_control': 'standard',
        'audit_logging': True,
        'field_level_encryption': False
    },
    DataClassification.PUBLIC.value: {
        'encryption': None,
        'access_control': 'basic',
        'audit_logging': False,
        'field_level_encryption': False
    }
}

# Initialize request status configuration
request_status_config = {
    RequestStatus.DRAFT.value: {
        'editable': True,
        'visible_to_vendors': False,
        'requires_approval': False
    },
    RequestStatus.SUBMITTED.value: {
        'editable': False,
        'visible_to_vendors': False,
        'requires_approval': True
    },
    RequestStatus.IN_REVIEW.value: {
        'editable': False,
        'visible_to_vendors': True,
        'requires_approval': False
    },
    RequestStatus.COMPLETED.value: {
        'editable': False,
        'visible_to_vendors': True,
        'requires_approval': False
    },
    RequestStatus.CANCELLED.value: {
        'editable': False,
        'visible_to_vendors': False,
        'requires_approval': False
    }
}

# Initialize proposal status configuration
proposal_status_config = {
    ProposalStatus.PENDING.value: {
        'editable': True,
        'visible_to_buyer': False,
        'requires_approval': False
    },
    ProposalStatus.SUBMITTED.value: {
        'editable': False,
        'visible_to_buyer': True,
        'requires_approval': False
    },
    ProposalStatus.ACCEPTED.value: {
        'editable': False,
        'visible_to_buyer': True,
        'requires_approval': False
    },
    ProposalStatus.REJECTED.value: {
        'editable': False,
        'visible_to_buyer': True,
        'requires_approval': False
    },
    ProposalStatus.WITHDRAWN.value: {
        'editable': False,
        'visible_to_buyer': False,
        'requires_approval': False
    }
}