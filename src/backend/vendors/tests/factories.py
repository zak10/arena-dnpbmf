"""
Factory classes for generating test data for vendor models in the Arena MVP platform.

This module implements:
- Realistic vendor data generation
- Security classification handling
- Consistent test data patterns
- Industry-specific capabilities

Version: 1.0.0
"""

import json
import factory
from faker import Faker
from core.constants import DataClassification
from vendors.models import Vendor, VENDOR_STATUS_CHOICES, PENDING

# Configure Faker for consistent test data
faker = Faker()
faker.seed_instance(12345)

# Default capabilities structure
DEFAULT_CAPABILITIES = {
    "technologies": [],
    "industries": [],
    "company_size": [],
    "features": [],
    "pricing_tiers": [],
    "implementation_time": ""
}

class VendorFactory(factory.django.DjangoModelFactory):
    """
    Factory class for generating test Vendor instances with realistic data
    and proper security classification.
    
    Implements:
    - Realistic company data generation
    - Proper security classification
    - Industry-specific capabilities
    - Status transitions
    """

    class Meta:
        model = Vendor
        strategy = factory.CREATE_STRATEGY

    # Basic vendor information with realistic patterns
    name = factory.LazyAttribute(lambda _: faker.company())
    website = factory.LazyAttribute(
        lambda obj: f"https://www.{obj.name.lower().replace(' ', '')}.com"
    )
    description = factory.LazyAttribute(
        lambda obj: (
            f"{obj.name} is a leading provider of enterprise software solutions. "
            f"{faker.paragraph(nb_sentences=3)} "
            f"Our technology focuses on {faker.bs()}."
        )
    )
    
    # Default to pending status for new vendors
    status = PENDING
    
    # Initialize with default capabilities structure
    capabilities = factory.LazyAttribute(
        lambda _: {
            "technologies": [
                faker.random_element([
                    "Python", "Java", "JavaScript", "React", "Node.js",
                    "AWS", "Azure", "Docker", "Kubernetes"
                ]) for _ in range(3)
            ],
            "industries": [
                faker.random_element([
                    "Technology", "Finance", "Healthcare", "Manufacturing",
                    "Retail", "Education", "Government"
                ]) for _ in range(2)
            ],
            "company_size": [
                faker.random_element([
                    "1-50", "51-200", "201-1000", "1001-5000", "5000+"
                ]) for _ in range(2)
            ],
            "features": [
                faker.random_element([
                    "API Integration", "Single Sign-On", "Custom Reporting",
                    "Mobile Support", "Data Analytics", "Workflow Automation"
                ]) for _ in range(4)
            ],
            "pricing_tiers": [
                {
                    "name": tier,
                    "price": f"${faker.random_int(min=100, max=1000)}/month",
                    "features": [faker.bs() for _ in range(3)]
                } for tier in ["Basic", "Professional", "Enterprise"]
            ],
            "implementation_time": faker.random_element([
                "1-2 weeks", "2-4 weeks", "1-2 months", "3+ months"
            ])
        }
    )

    # Set security classification for vendor data
    data_classification = DataClassification.SENSITIVE.value

    @factory.post_generation
    def setup_metadata(obj, create, extracted, **kwargs):
        """
        Post-generation hook to set up vendor metadata.
        
        Args:
            create (bool): Whether to create a new instance
            extracted: Extracted values from factory declaration
            **kwargs: Additional keyword arguments
        """
        if not create:
            return

        obj.metadata = {
            "status_history": [{
                "from": None,
                "to": obj.status,
                "timestamp": obj.created_at.isoformat()
            }],
            "verification_history": [],
            "capabilities_history": []
        }
        obj.save()

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """
        Override create method to ensure proper initialization.
        
        Args:
            model_class: The model class to create
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            Vendor: Created vendor instance
        """
        # Ensure unique name generation
        while True:
            try:
                return super()._create(model_class, *args, **kwargs)
            except Exception:  # Retry on duplicate name
                kwargs['name'] = factory.LazyAttribute(lambda _: faker.company())

    @classmethod
    def create_batch_with_status(cls, size, status):
        """
        Create multiple vendors with a specific status.
        
        Args:
            size (int): Number of vendors to create
            status (str): Status to assign to vendors
            
        Returns:
            list[Vendor]: List of created vendor instances
        """
        return [cls(status=status) for _ in range(size)]