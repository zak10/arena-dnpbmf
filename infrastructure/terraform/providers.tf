# Provider configuration for Arena MVP infrastructure
# Terraform version: >=1.5.0
# AWS Provider version: ~> 5.0

terraform {
  # Enforce minimum Terraform version to ensure compatibility
  required_version = ">=1.5.0"

  # Define required providers and their version constraints
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure AWS provider with regional settings and default resource tags
provider "aws" {
  # Use region specified in variables
  region = var.region

  # Apply default tags to all resources created by this provider
  default_tags {
    tags = {
      Project     = "Arena"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}