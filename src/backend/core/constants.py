"""
Core constants and enumerations for the Arena MVP platform.

This module provides centralized configuration for:
- Data classification levels and security controls
- Error codes and ranges
- Performance thresholds and benchmarks
- System-wide settings and configurations
- Request and proposal status enumerations

Version: 1.0.0
"""

from enum import Enum  # Python 3.11+
from http import HTTPStatus  # Python 3.11+

# Version Information
VERSION = "1.0.0"

# Error Code Categories and Ranges
ERROR_CODES = {
    "AUTHENTICATION": "E1xxx",
    "REQUEST": "E2xxx",
    "PROPOSAL": "E3xxx",
    "SYSTEM": "E4xxx"
}

ERROR_CODE_RANGES = {
    "AUTHENTICATION": {
        "INVALID_CREDENTIALS": "E1001",
        "EXPIRED_SESSION": "E1002",
        "INVALID_MAGIC_LINK": "E1003",
        "RANGE": "E1001-E1999"
    },
    "REQUEST": {
        "INVALID_FORMAT": "E2001",
        "MISSING_FIELDS": "E2002",
        "UPLOAD_FAILED": "E2003",
        "RANGE": "E2001-E2999"
    },
    "PROPOSAL": {
        "INVALID_STATUS": "E3001",
        "DUPLICATE_SUBMISSION": "E3002",
        "MISSING_INFORMATION": "E3003",
        "RANGE": "E3001-E3999"
    },
    "SYSTEM": {
        "AI_PROCESSING_FAILED": "E4001",
        "DATABASE_ERROR": "E4002",
        "SERVICE_UNAVAILABLE": "E4003",
        "RANGE": "E4001-E4999"
    }
}

# Performance Monitoring Thresholds (in milliseconds)
PERFORMANCE_THRESHOLDS = {
    "REQUEST_TIME_MS": 500,
    "CRITICAL_TIME_MS": 2000,
    "TIME_TO_FIRST_BYTE_MS": 200,
    "FIRST_CONTENTFUL_PAINT_MS": 1500,
    "TIME_TO_INTERACTIVE_MS": 3500,
    "API_RESPONSE_TIME_MS": 500,
    "AI_PROCESSING_TIME_MS": 5000,
    "CRITICAL_AI_PROCESSING_TIME_MS": 10000
}

# HTTP Header Constants
HTTP_HEADERS = {
    "REQUEST_TIME": "X-Request-Time-Ms",
    "CORRELATION_ID": "X-Correlation-ID",
    "CLIENT_VERSION": "X-Client-Version",
    "REQUEST_ID": "X-Request-ID",
    "API_VERSION": "X-API-Version",
    "RATE_LIMIT_REMAINING": "X-RateLimit-Remaining"
}

# Cache Timeout Settings (in seconds)
CACHE_TIMEOUTS = {
    "DEFAULT": 300,  # 5 minutes
    "VENDOR_LIST": 3600,  # 1 hour
    "USER_SESSION": 86400,  # 24 hours
    "API_RESPONSE": 60,  # 1 minute
    "STATIC_ASSETS": 604800,  # 1 week
    "PROPOSAL_LIST": 1800  # 30 minutes
}

class DataClassification(Enum):
    """
    Enumeration of data classification levels for implementing security controls 
    and data protection measures.
    """
    HIGHLY_SENSITIVE = "highly_sensitive"
    SENSITIVE = "sensitive"
    PUBLIC = "public"

class RequestStatus(Enum):
    """
    Enumeration of all possible states for a software evaluation request 
    throughout its lifecycle.
    """
    DRAFT = "draft"
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ProposalStatus(Enum):
    """
    Enumeration of all possible states for a vendor proposal throughout 
    its lifecycle.
    """
    PENDING = "pending"
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

# Export all public constants and enums
__all__ = [
    'VERSION',
    'ERROR_CODES',
    'ERROR_CODE_RANGES',
    'PERFORMANCE_THRESHOLDS',
    'HTTP_HEADERS',
    'CACHE_TIMEOUTS',
    'DataClassification',
    'RequestStatus',
    'ProposalStatus'
]