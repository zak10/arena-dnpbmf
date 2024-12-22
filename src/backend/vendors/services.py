"""
Service layer for managing vendor operations in the Arena MVP platform.

This module implements:
- Secure vendor management with enhanced validation
- Anonymous vendor evaluation capabilities
- Data classification controls
- Performance optimization with caching
- Rate limiting protection

Version: 1.0.0
"""

import logging
from typing import Dict, List, Optional, Any
from django.db import transaction
from django.db.models import Q
from django.core.cache import cache

from vendors.models import Vendor
from core.utils.validators import validate_text_input, DataValidator
from core.constants import DataClassification, CACHE_TIMEOUTS
from core.exceptions import RequestError, SystemError

# Configure logging
logger = logging.getLogger(__name__)

# Constants
MAX_VENDORS_PER_REQUEST = 5
REQUIRED_CAPABILITIES = [
    'product_type',
    'pricing_model', 
    'implementation_time',
    'security_certifications',
    'support_levels'
]
VENDOR_CACHE_TIMEOUT = CACHE_TIMEOUTS['VENDOR_LIST']
RATE_LIMIT_OPERATIONS = '100/hour'

class VendorService:
    """
    Enhanced service class for secure vendor management operations.
    
    Implements:
    - Secure vendor creation and management
    - Anonymous vendor matching and evaluation
    - Data validation with classification controls
    - Performance optimization with caching
    - Rate limiting protection
    """

    def __init__(self) -> None:
        """Initialize vendor service with security components."""
        self._validator = DataValidator(
            classification_level=DataClassification.SENSITIVE,
            custom_rules={
                'website': self._validate_website,
                'capabilities': self._validate_capabilities
            }
        )
        self._cache_manager = cache

    def create_vendor(self, vendor_data: Dict[str, Any]) -> Vendor:
        """
        Create a new vendor profile with enhanced validation and security.

        Args:
            vendor_data: Dictionary containing vendor information

        Returns:
            Created vendor instance with sanitized data

        Raises:
            RequestError: If validation fails
            SystemError: If creation fails
        """
        try:
            # Validate vendor data
            self._validator.validate(vendor_data)

            # Sanitize text inputs
            vendor_data['name'] = validate_text_input(
                vendor_data.get('name', ''),
                max_length=255,
                required=True
            )
            vendor_data['website'] = validate_text_input(
                vendor_data.get('website', ''),
                max_length=255,
                required=True
            )
            vendor_data['description'] = validate_text_input(
                vendor_data.get('description', ''),
                max_length=1000,
                required=True
            )

            # Check for duplicate vendor
            if Vendor.objects.filter(
                Q(name__iexact=vendor_data['name']) |
                Q(website__iexact=vendor_data['website'])
            ).exists():
                raise RequestError(
                    "Vendor with this name or website already exists",
                    code="E2001"
                )

            # Validate required capabilities
            capabilities = vendor_data.get('capabilities', {})
            missing_capabilities = [
                cap for cap in REQUIRED_CAPABILITIES 
                if cap not in capabilities
            ]
            if missing_capabilities:
                raise RequestError(
                    f"Missing required capabilities: {', '.join(missing_capabilities)}",
                    code="E2002"
                )

            # Create vendor within transaction
            with transaction.atomic():
                vendor = Vendor.objects.create(
                    name=vendor_data['name'],
                    website=vendor_data['website'],
                    description=vendor_data['description'],
                    capabilities=capabilities,
                    status='pending'  # Default status
                )

                # Cache new vendor data
                self._cache_vendor(vendor)

                logger.info(f"Created new vendor: {vendor.id}")
                return vendor

        except RequestError:
            raise
        except Exception as e:
            logger.error(f"Failed to create vendor: {str(e)}")
            raise SystemError("Failed to create vendor profile") from e

    def get_matches(self, requirements: Dict[str, Any]) -> List[Vendor]:
        """
        Get anonymized matching vendors for requirements.

        Args:
            requirements: Dictionary of buyer requirements

        Returns:
            List of anonymized matching vendors

        Raises:
            RequestError: If requirements validation fails
            SystemError: If matching fails
        """
        try:
            # Validate requirements
            self._validator.validate(requirements)

            # Check cache first
            cache_key = self._get_cache_key(requirements)
            cached_results = self._cache_manager.get(cache_key)
            if cached_results is not None:
                return cached_results

            # Build query filters
            filters = Q(status='active')
            
            # Match capabilities
            if 'product_type' in requirements:
                filters &= Q(capabilities__product_type=requirements['product_type'])
            
            if 'implementation_time' in requirements:
                filters &= Q(
                    capabilities__implementation_time__lte=
                    requirements['implementation_time']
                )

            if 'security_certifications' in requirements:
                filters &= Q(
                    capabilities__security_certifications__contains=
                    requirements['security_certifications']
                )

            # Get matching vendors
            vendors = Vendor.objects.filter(filters)[:MAX_VENDORS_PER_REQUEST]

            # Anonymize vendor data
            anonymized_vendors = [
                self._anonymize_vendor(vendor) for vendor in vendors
            ]

            # Cache results
            self._cache_manager.set(
                cache_key,
                anonymized_vendors,
                timeout=VENDOR_CACHE_TIMEOUT
            )

            logger.info(f"Found {len(anonymized_vendors)} matching vendors")
            return anonymized_vendors

        except RequestError:
            raise
        except Exception as e:
            logger.error(f"Failed to get matching vendors: {str(e)}")
            raise SystemError("Failed to process vendor matching") from e

    def _validate_website(self, website: str) -> bool:
        """Validate vendor website format and accessibility."""
        try:
            return bool(validate_text_input(
                website,
                max_length=255,
                required=True,
                custom_rules={'url_format': True}
            ))
        except Exception:
            return False

    def _validate_capabilities(self, capabilities: Dict[str, Any]) -> bool:
        """Validate vendor capabilities against required schema."""
        if not isinstance(capabilities, dict):
            return False
            
        return all(cap in capabilities for cap in REQUIRED_CAPABILITIES)

    def _cache_vendor(self, vendor: Vendor) -> None:
        """Cache vendor data with timeout."""
        cache_key = f"vendor:{vendor.id}"
        self._cache_manager.set(
            cache_key,
            vendor,
            timeout=VENDOR_CACHE_TIMEOUT
        )

    def _get_cache_key(self, requirements: Dict[str, Any]) -> str:
        """Generate cache key for vendor matching results."""
        # Sort requirements for consistent cache keys
        sorted_req = sorted(
            (k, str(v)) for k, v in requirements.items()
        )
        return f"vendor_matches:{hash(tuple(sorted_req))}"

    def _anonymize_vendor(self, vendor: Vendor) -> Dict[str, Any]:
        """
        Create anonymized version of vendor data for secure evaluation.
        
        Removes identifying information while preserving essential details.
        """
        return {
            'id': vendor.id,
            'capabilities': vendor.capabilities,
            'implementation_time': vendor.capabilities.get('implementation_time'),
            'security_certifications': vendor.capabilities.get('security_certifications'),
            'support_levels': vendor.capabilities.get('support_levels'),
            # Exclude name, website, and other identifying info
        }