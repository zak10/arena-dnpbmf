"""
Factory classes for generating test user instances with predefined attributes.

This module provides:
- Base UserFactory with secure data generation
- BuyerFactory for buyer role test instances
- ArenaStaffFactory for staff role test instances

Version: 1.0.0
"""

import factory
from faker import Faker
from users.models import User
from core.constants import DataClassification

# Initialize faker with consistent seed for reproducibility
faker = Faker()
faker.seed_instance(12345)

# Configure business email domains for test data
ALLOWED_EMAIL_DOMAINS = [
    'company.com',
    'enterprise.com', 
    'business.com',
    'corp.com'
]

# Restricted patterns for security
RESTRICTED_PATTERNS = [
    'admin',
    'root',
    'system',
    'test'
]

class UserFactory(factory.django.DjangoModelFactory):
    """
    Base factory class for generating secure User model test instances.
    
    Implements:
    - Business email validation
    - Secure data generation
    - Proper data classification
    - Password security controls
    """
    
    class Meta:
        model = User
        
    # Basic user attributes with security validation
    email = factory.LazyAttribute(lambda o: faker.email())
    full_name = factory.LazyAttribute(lambda o: faker.name())
    company = factory.LazyAttribute(lambda o: faker.company())
    is_active = True
    data_classification = DataClassification.HIGHLY_SENSITIVE.value
    
    @factory.lazy_attribute
    def email(self):
        """Generate secure business email with domain validation."""
        while True:
            email = faker.email()
            domain = email.split('@')[1]
            
            # Validate against allowed domains
            if domain in ALLOWED_EMAIL_DOMAINS:
                # Check for restricted patterns
                if not any(pattern in email.lower() for pattern in RESTRICTED_PATTERNS):
                    return email
                    
    @factory.lazy_attribute 
    def full_name(self):
        """Generate sanitized full name."""
        while True:
            name = faker.name()
            # Validate against restricted patterns
            if not any(pattern in name.lower() for pattern in RESTRICTED_PATTERNS):
                return name
                
    @factory.lazy_attribute
    def company(self):
        """Generate validated company name."""
        while True:
            company = faker.company()
            # Validate against restricted patterns
            if not any(pattern in company.lower() for pattern in RESTRICTED_PATTERNS):
                return company
                
    @factory.post_generation
    def set_password(self, create, extracted, **kwargs):
        """Set secure password with proper hashing."""
        if not create:
            return
            
        if extracted:
            # Use provided password
            self.set_password(extracted)
        else:
            # Generate secure password
            password = faker.password(
                length=16,
                special_chars=True,
                digits=True,
                upper_case=True,
                lower_case=True
            )
            self.set_password(password)
            
class BuyerFactory(UserFactory):
    """Factory class for generating buyer user test instances."""
    
    role = 'buyer'
    data_classification = DataClassification.SENSITIVE.value
    
    @classmethod
    def create_with_request(cls, request_data=None):
        """Create buyer with associated request data."""
        buyer = cls.create()
        
        if request_data:
            # Create associated request
            from requests.tests.factories import RequestFactory
            RequestFactory.create(
                user=buyer,
                data_classification=DataClassification.SENSITIVE.value,
                **request_data
            )
            
        return buyer
        
class ArenaStaffFactory(UserFactory):
    """Factory class for generating Arena staff user test instances."""
    
    role = 'arena_staff'
    is_staff = True
    data_classification = DataClassification.HIGHLY_SENSITIVE.value
    
    @classmethod
    def create_with_permissions(cls, permissions=None):
        """Create staff user with specific permissions."""
        staff = cls.create()
        
        if permissions:
            # Assign permissions
            for permission in permissions:
                staff.user_permissions.add(permission)
                
        return staff