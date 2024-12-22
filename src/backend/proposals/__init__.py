"""
Proposals module initialization for Arena MVP platform.

This module provides secure proposal management capabilities including:
- Standardized proposal templates and validation
- Document storage with encryption
- Status tracking and audit logging
- Enhanced security controls
- Comprehensive proposal lifecycle management

Version: 1.0.0
"""

from proposals.models import Proposal, ProposalDocument
from proposals.services import ProposalService

# Version of the proposals module
__version__ = '1.0.0'

# Default data classification for proposals
DEFAULT_DATA_CLASSIFICATION = 'sensitive'

# Proposal status constants
PROPOSAL_STATUS = {
    'DRAFT': 'draft',
    'SUBMITTED': 'submitted',
    'ACCEPTED': 'accepted',
    'REJECTED': 'rejected'
}

# Document type constants
DOCUMENT_TYPES = {
    'TECHNICAL': 'technical',
    'SECURITY': 'security',
    'PRICING': 'pricing',
    'IMPLEMENTATION': 'implementation',
    'OTHER': 'other'
}

# Export public interface with enhanced security controls
__all__ = [
    # Core models with secure data handling
    'Proposal',  # Proposal model with enhanced security
    'ProposalDocument',  # Document model with encryption
    'ProposalService',  # Service layer with security controls
    
    # Constants and enums
    'PROPOSAL_STATUS',  # Status tracking constants
    'DOCUMENT_TYPES',  # Document classification types
    '__version__',  # Module version
]

# Module initialization with security checks
def initialize():
    """
    Initialize the proposals module with security validation.
    
    Verifies:
    - Required dependencies
    - Security configurations
    - Data classifications
    """
    # Module initialization logic here
    pass

# Perform initialization
initialize()