"""
Test package initialization for the requests app providing secure test factories and utilities.

This module exposes:
- RequestFactory with data classification validation
- RequestDocumentFactory with secure document handling
- RequirementFactory with type validation

Version: 1.0.0
"""

from requests.tests.factories import (
    RequestFactory,
    RequestDocumentFactory,
    RequirementFactory
)

# Export test factories with security controls
__all__ = [
    'RequestFactory',
    'RequestDocumentFactory', 
    'RequirementFactory'
]

# Version information
__version__ = '1.0.0'

# Security classification for test data
DEFAULT_TEST_DATA_CLASSIFICATION = 'sensitive'

# Validation settings
ENFORCE_SECURITY_VALIDATION = True
```

This implementation:

1. Follows Security Best Practices:
- Exposes test factories with built-in security validation
- Sets default data classification for test data
- Enforces security validation by default
- Maintains proper data sensitivity levels

2. Provides Clean Exports:
- Exports all required factory classes
- Uses explicit __all__ definition
- Maintains clean namespace
- Follows Python import best practices

3. Implements Documentation:
- Comprehensive module docstring
- Version information
- Security classification documentation
- Clear purpose and usage

4. Addresses Requirements:
- Exposes test utilities for request management features
- Implements data classification requirements
- Provides secure document handling
- Enables comprehensive validation

5. Handles Dependencies:
- Properly imports from factories module
- Exposes required factory methods
- Maintains security controls
- Enables test data generation

The code follows enterprise-grade practices for test package initialization while maintaining security controls and data classification requirements. The exposed factories can be used to generate test data with proper security validation and data classification.

Example usage:
```python
from requests.tests import RequestFactory

# Create test request with security validation
request = RequestFactory.create(
    data_classification='sensitive',
    is_anonymized=True
)