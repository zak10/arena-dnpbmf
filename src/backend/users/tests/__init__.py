"""
Test package initialization file for the users app test suite.

This module configures the test environment with:
- Security controls and data classification settings
- Test data factories with enhanced security validation
- Test fixtures for authentication and authorization testing

Version: 1.0.0
"""

import pytest
import logging
from users.tests.factories import UserFactory, BuyerFactory, ArenaStaffFactory
from core.constants import DataClassification

# Configure logging for tests
logger = logging.getLogger(__name__)

# Test environment constants
TEST_EMAIL = 'test@company.com'
TEST_NAME = 'Test User'
TEST_COMPANY = 'Test Company'

# Role constants
BUYER_ROLE = 'buyer'
ARENA_STAFF_ROLE = 'arena_staff'

# Data classification constants
DATA_CLASSIFICATION_HIGHLY_SENSITIVE = DataClassification.HIGHLY_SENSITIVE.value
DATA_CLASSIFICATION_SENSITIVE = DataClassification.SENSITIVE.value
DATA_CLASSIFICATION_PUBLIC = DataClassification.PUBLIC.value

# Environment settings
TEST_ENVIRONMENT = 'test'
SECURITY_VALIDATION_ENABLED = True

@pytest.fixture(scope='session')
def configure_test_environment(environment: str = TEST_ENVIRONMENT, 
                             security_validation: bool = SECURITY_VALIDATION_ENABLED):
    """
    Configures the test environment with security controls and data classification settings.
    
    Args:
        environment (str): Test environment name
        security_validation (bool): Whether to enable security validation
        
    Returns:
        None: Configures environment without return value
    """
    logger.info(f"Configuring test environment: {environment}")
    
    # Set test environment variables
    pytest.test_env = environment
    pytest.security_validation = security_validation
    
    # Configure security validation settings
    if security_validation:
        logger.info("Security validation enabled for tests")
        pytest.security_controls = {
            'data_classification': True,
            'role_validation': True,
            'access_control': True
        }
    
    # Initialize data classification controls
    pytest.data_classifications = {
        'highly_sensitive': DATA_CLASSIFICATION_HIGHLY_SENSITIVE,
        'sensitive': DATA_CLASSIFICATION_SENSITIVE,
        'public': DATA_CLASSIFICATION_PUBLIC
    }
    
    # Set up test isolation
    pytest.test_isolation = True
    
    # Configure test logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s'
    )
    
    logger.info("Test environment configuration completed")

@pytest.fixture
def validate_data_classification(data_type: str, classification_level: str):
    """
    Validates data classification and security controls in test environment.
    
    Args:
        data_type (str): Type of data being validated
        classification_level (str): Expected classification level
        
    Returns:
        bool: True if validation passes, False otherwise
    """
    logger.info(f"Validating {data_type} classification: {classification_level}")
    
    # Check data classification level
    if classification_level not in pytest.data_classifications.values():
        logger.error(f"Invalid classification level: {classification_level}")
        return False
        
    # Validate security controls
    if pytest.security_validation:
        if not pytest.security_controls['data_classification']:
            logger.error("Data classification validation disabled")
            return False
            
    # Verify access permissions
    if classification_level == DATA_CLASSIFICATION_HIGHLY_SENSITIVE:
        if not pytest.security_controls['access_control']:
            logger.error("Access control validation required for highly sensitive data")
            return False
            
    # Log validation results
    logger.info(f"Data classification validation passed for {data_type}")
    return True

# Export test factories and fixtures
__all__ = [
    'UserFactory',
    'BuyerFactory', 
    'ArenaStaffFactory',
    'configure_test_environment',
    'validate_data_classification'
]