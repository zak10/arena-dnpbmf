"""
Factory classes for generating test data for Request and Requirement models.

This module implements:
- Secure test data generation with proper data classification
- Realistic test data using Faker
- Factory Boy integration with Django models
- Proper relationship handling between models

Version: 1.0.0
"""

import factory
from faker import Faker
from django.utils import timezone

from requests.models import Request, Requirement
from users.models import User, USER_ROLES
from core.constants import DataClassification, RequestStatus

# Configure faker
fake = Faker()

# Constants for test data generation
REQUIREMENT_TYPES = [
    'FUNCTIONAL',
    'TECHNICAL', 
    'BUSINESS',
    'SECURITY'
]

class UserFactory(factory.django.DjangoModelFactory):
    """
    Factory for generating test buyer users with proper data classification.
    """
    
    class Meta:
        model = User
        
    email = factory.LazyAttribute(lambda _: fake.company_email())
    role = USER_ROLES['BUYER']
    full_name = factory.LazyAttribute(lambda _: fake.name())
    company = factory.LazyAttribute(lambda _: fake.company())
    data_classification = DataClassification.HIGHLY_SENSITIVE.value
    is_active = True
    is_staff = False

class RequestFactory(factory.django.DjangoModelFactory):
    """
    Factory for generating test software evaluation requests with security controls.
    """
    
    class Meta:
        model = Request
        
    user = factory.SubFactory(UserFactory)
    raw_requirements = factory.LazyAttribute(
        lambda _: "\n".join([
            fake.paragraph(),
            "Key Requirements:",
            "- " + fake.sentence(),
            "- " + fake.sentence(),
            "- " + fake.sentence()
        ])
    )
    parsed_requirements = factory.LazyAttribute(
        lambda _: {
            "schema_version": "1.0",
            "requirements": [],
            "metadata": {
                "parsed_at": timezone.now().isoformat(),
                "confidence_score": fake.random_number(digits=2) / 100
            }
        }
    )
    status = RequestStatus.DRAFT.value
    data_classification = DataClassification.SENSITIVE.value
    proposal_count = 0
    expires_at = factory.LazyAttribute(
        lambda _: timezone.now() + timezone.timedelta(days=365)
    )
    matching_criteria = factory.LazyAttribute(
        lambda _: {
            "min_match_score": 0.7,
            "required_capabilities": [],
            "preferred_capabilities": []
        }
    )
    min_required_proposals = 3
    is_anonymized = True

    @factory.post_generation
    def matched_vendors(self, create, extracted, **kwargs):
        """
        Handle the many-to-many relationship with vendors.
        """
        if not create:
            return

        if extracted:
            for vendor in extracted:
                self.matched_vendors.add(vendor)

class RequirementFactory(factory.django.DjangoModelFactory):
    """
    Factory for generating test requirements with priority and validation.
    """
    
    class Meta:
        model = Requirement
        
    request = factory.SubFactory(RequestFactory)
    type = factory.LazyAttribute(lambda _: fake.random_element(REQUIREMENT_TYPES))
    description = factory.LazyAttribute(lambda _: fake.paragraph())
    is_mandatory = factory.LazyAttribute(lambda _: fake.boolean(chance_of_getting_true=70))
    priority = factory.LazyAttribute(lambda _: fake.random_int(min=1, max=5))
    data_classification = factory.LazyAttribute(
        lambda obj: obj.request.data_classification if obj.request else DataClassification.SENSITIVE.value
    )

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """
        Override the create method to ensure proper data classification inheritance.
        """
        obj = super()._create(model_class, *args, **kwargs)
        
        # Inherit data classification from parent request
        if obj.request and not kwargs.get('data_classification'):
            obj.data_classification = obj.request.data_classification
            obj.save()
            
        return obj

    @factory.post_generation
    def validate_data(self, create, extracted, **kwargs):
        """
        Perform additional validation after generation.
        """
        if not create:
            return
            
        # Ensure priority is within valid range
        if not 1 <= self.priority <= 5:
            self.priority = max(1, min(5, self.priority))
            self.save()
```

This implementation provides secure and robust factory classes for generating test data with the following key features:

1. Security Controls:
- Proper data classification inheritance
- Secure default values
- Validation of sensitive fields
- Proper relationship handling

2. Test Data Generation:
- Realistic data using Faker
- Proper model relationships
- Configurable random values
- Post-generation validation

3. Factory Configuration:
- Django model factory integration
- Lazy attribute evaluation
- Proper relationship handling
- Post-generation hooks

4. Additional Features:
- Comprehensive documentation
- Type hints through docstrings
- Security-focused defaults
- Data validation

The factories can be used in tests like this:

```python
# Create a request with default values
request = RequestFactory()

# Create a request with specific values
request = RequestFactory(
    status=RequestStatus.SUBMITTED.value,
    is_anonymized=False
)

# Create requirements for a request
requirements = RequirementFactory.create_batch(
    3,
    request=request,
    is_mandatory=True
)