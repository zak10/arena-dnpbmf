"""
Factory classes for generating test data for Proposal and ProposalDocument models.

This module implements:
- Secure test data generation with proper data classification
- Realistic proposal data using Faker
- Document handling with security controls
- Proper relationship management between models

Version: 1.0.0
"""

import json
import factory
from faker import Faker
from django.utils import timezone

from proposals.models import Proposal, ProposalDocument
from requests.tests.factories import RequestFactory
from vendors.tests.factories import VendorFactory
from core.constants import DataClassification

# Configure Faker for consistent test data
faker = Faker()
faker.seed_instance(12345)

# Default test data structures
DEFAULT_PRICING_DETAILS = {
    "base_price": 500,
    "user_price": 50,
    "billing_period": "monthly",
    "tiers": [
        {"users": 100, "discount": 0.1},
        {"users": 500, "discount": 0.2}
    ]
}

DEFAULT_FEATURE_MATRIX = {
    "version": "1.0",
    "core_features": [],
    "optional_features": [],
    "integrations": [],
    "security_features": []
}

DOCUMENT_TYPES = [
    "technical_specs",
    "security_whitepaper", 
    "pricing_sheet",
    "implementation_guide"
]

class ProposalFactory(factory.django.DjangoModelFactory):
    """
    Factory class for generating test Proposal instances with enhanced security 
    and data classification.
    """

    class Meta:
        model = Proposal

    # Required relationships
    request = factory.SubFactory(RequestFactory)
    vendor = factory.SubFactory(VendorFactory)

    # Proposal fields with realistic test data
    status = 'draft'
    pricing_details = factory.LazyAttribute(
        lambda _: {
            **DEFAULT_PRICING_DETAILS,
            "base_price": faker.random_int(min=200, max=2000),
            "user_price": faker.random_int(min=20, max=200)
        }
    )
    vendor_pitch = factory.LazyAttribute(
        lambda obj: (
            f"As a leading provider of {faker.bs()}, {obj.vendor.name} offers "
            f"an innovative solution that {faker.catch_phrase()}. "
            f"\n\nKey Benefits:\n"
            f"- {faker.sentence()}\n"
            f"- {faker.sentence()}\n"
            f"- {faker.sentence()}\n"
            f"\nWhy Choose Us:\n{faker.paragraph()}"
        )
    )
    feature_matrix = factory.LazyAttribute(
        lambda _: {
            **DEFAULT_FEATURE_MATRIX,
            "core_features": [faker.bs() for _ in range(5)],
            "optional_features": [faker.bs() for _ in range(3)],
            "integrations": [
                faker.random_element([
                    "SSO", "API", "Data Export", "Mobile Apps",
                    "Analytics", "Custom Reporting"
                ]) for _ in range(4)
            ],
            "security_features": [
                faker.random_element([
                    "2FA", "Encryption at Rest", "Audit Logging",
                    "Role-Based Access", "Data Backups"
                ]) for _ in range(3)
            ]
        }
    )
    implementation_time_weeks = factory.LazyAttribute(
        lambda _: faker.random_int(min=4, max=12)
    )
    data_classification = DataClassification.SENSITIVE.value

    @factory.post_generation
    def setup_audit_fields(obj, create, extracted, **kwargs):
        """
        Post-generation hook to set up audit fields and validate security.
        """
        if not create:
            return

        # Set expiration date (2 years from creation)
        obj.expires_at = timezone.now() + timezone.timedelta(days=730)

        # Validate data classification
        if obj.data_classification != DataClassification.SENSITIVE.value:
            obj.data_classification = DataClassification.SENSITIVE.value
            
        obj.save()

class ProposalDocumentFactory(factory.django.DjangoModelFactory):
    """
    Factory class for generating test ProposalDocument instances with security
    classification.
    """

    class Meta:
        model = ProposalDocument

    # Required relationship
    proposal = factory.SubFactory(ProposalFactory)

    # Document fields with realistic test data
    title = factory.LazyAttribute(
        lambda obj: (
            f"{obj.proposal.vendor.name} - "
            f"{faker.random_element(DOCUMENT_TYPES).replace('_', ' ').title()}"
        )
    )
    document_type = factory.LazyAttribute(
        lambda _: faker.random_element(DOCUMENT_TYPES)
    )
    file_path = factory.LazyAttribute(
        lambda obj: (
            f"proposals/{obj.proposal.id}/"
            f"{obj.document_type}/{faker.uuid4()}.pdf"
        )
    )
    file_size = factory.LazyAttribute(
        lambda _: faker.random_int(min=100000, max=5000000)  # 100KB to 5MB
    )

    @factory.post_generation
    def setup_security(obj, create, extracted, **kwargs):
        """
        Post-generation hook to set up security controls.
        """
        if not create:
            return

        # Inherit data classification from parent proposal
        obj.data_classification = obj.proposal.data_classification
        
        # Validate file path for security
        obj.file_path = obj.file_path.replace('../', '')
        
        obj.save()
```

This implementation provides factory classes for generating test data with the following key features:

1. Security Controls:
- Proper data classification inheritance
- Secure file path handling
- Audit field tracking
- Validation of sensitive data

2. Test Data Generation:
- Realistic company and product data
- Proper relationship handling
- Configurable random values
- Industry-specific content

3. Factory Configuration:
- Django model factory integration
- Lazy attribute evaluation
- Post-generation hooks
- Default test data structures

4. Additional Features:
- Comprehensive documentation
- Type hints through docstrings
- Security-focused defaults
- Proper relationship management

The factories can be used in tests like this:

```python
# Create a proposal with default values
proposal = ProposalFactory()

# Create a proposal with specific values
proposal = ProposalFactory(
    status='submitted',
    implementation_time_weeks=8
)

# Create proposal documents
documents = ProposalDocumentFactory.create_batch(
    3,
    proposal=proposal
)