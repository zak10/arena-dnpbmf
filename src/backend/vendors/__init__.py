"""
Initialization module for the vendors package in the Arena MVP platform.

This module exports core vendor management functionality with:
- Enhanced security and validation
- Anonymous vendor evaluation
- Data classification controls
- Performance optimization
- Rate limiting protection

Version: 1.0.0
"""

import logging
from typing import Dict, List, Any

from vendors.models import Vendor
from vendors.services import VendorService
from core.constants import DataClassification
from core.exceptions import RequestError, SystemError
from core.utils.validators import validate_text_input, DataValidator

# Configure logging
logger = logging.getLogger(__name__)

# Version information
VERSION = "1.0.0"

# Security configuration
DEFAULT_VENDOR_DATA_CLASSIFICATION = DataClassification.SENSITIVE.value
VENDOR_SECURITY_LEVEL = "HIGH"

# Initialize core services
_vendor_service = VendorService()
_validator = DataValidator(
    classification_level=DataClassification.SENSITIVE,
    custom_rules={
        'website': _vendor_service._validate_website,
        'capabilities': _vendor_service._validate_capabilities
    }
)

def create_vendor(vendor_data: Dict[str, Any], classification: str = DEFAULT_VENDOR_DATA_CLASSIFICATION) -> Vendor:
    """
    Create a new vendor with enhanced security and validation.

    Args:
        vendor_data: Dictionary containing vendor information
        classification: Data classification level for vendor data

    Returns:
        Vendor: Newly created vendor instance

    Raises:
        RequestError: If validation fails
        SystemError: If creation fails
    """
    try:
        # Validate classification
        if classification not in [dc.value for dc in DataClassification]:
            raise RequestError(
                "Invalid data classification",
                code="E2001"
            )

        # Validate vendor data
        _validator.validate(vendor_data)

        # Create vendor with service
        vendor = _vendor_service.create_vendor(vendor_data)

        logger.info(f"Created vendor {vendor.id} with classification {classification}")
        return vendor

    except (RequestError, SystemError):
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating vendor: {str(e)}")
        raise SystemError("Failed to create vendor") from e

def match_vendors(requirements: Dict[str, Any], anonymous: bool = True) -> List[Dict[str, Any]]:
    """
    Match vendors to requirements with optional anonymization.

    Args:
        requirements: Dictionary of buyer requirements
        anonymous: Whether to return anonymized vendor data

    Returns:
        List of matching vendor profiles (anonymized if requested)

    Raises:
        RequestError: If requirements validation fails
        SystemError: If matching fails
    """
    try:
        # Validate requirements
        _validator.validate(requirements)

        # Get matches using service
        matches = _vendor_service.get_matches(requirements)

        # Apply anonymization if requested
        if anonymous:
            matches = [
                _vendor_service._anonymize_vendor(vendor)
                for vendor in matches
            ]

        logger.info(
            f"Found {len(matches)} matching vendors "
            f"(anonymized={anonymous})"
        )
        return matches

    except (RequestError, SystemError):
        raise
    except Exception as e:
        logger.error(f"Unexpected error matching vendors: {str(e)}")
        raise SystemError("Failed to match vendors") from e

# Export public interfaces
__all__ = [
    'VERSION',
    'DEFAULT_VENDOR_DATA_CLASSIFICATION',
    'VENDOR_SECURITY_LEVEL',
    'Vendor',
    'VendorService',
    'create_vendor',
    'match_vendors'
]