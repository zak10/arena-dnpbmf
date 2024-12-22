"""
Python package initialization file for the vendors app test suite.

This module exposes test utilities and factories while maintaining proper
security controls and test isolation.

Version: 1.0.0
"""

# Import vendor factory for test data generation
from vendors.tests.factories import VendorFactory

# Version information
__version__ = "1.0.0"

# Expose vendor factory for test data generation
__all__ = ["VendorFactory"]