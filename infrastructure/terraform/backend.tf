# Backend configuration for Arena MVP infrastructure
# Terraform version: >= 1.5.0
# Purpose: Defines remote state storage and locking mechanism using AWS S3 and DynamoDB

terraform {
  # Configure S3 backend for remote state storage with DynamoDB locking
  backend "s3" {
    # State storage configuration
    bucket = "arena-terraform-state"
    key    = "${var.environment}/terraform.tfstate"
    region = "us-east-1"

    # Security configuration
    encrypt = true  # Enable server-side encryption for state files
    
    # State locking configuration
    dynamodb_table = "arena-terraform-locks"
    
    # Workspace and environment organization
    workspace_key_prefix = "arena"  # Prefix for workspace-specific state paths
    
    # Additional recommended settings for production use
    force_path_style = false  # Use virtual-hosted style S3 URLs
    skip_region_validation      = false  # Validate specified AWS region
    skip_credentials_validation = false  # Validate AWS credentials
    skip_metadata_api_check     = false  # Check EC2 metadata API
  }

  # Note: The following AWS resources must exist before using this backend:
  # 1. S3 Bucket: arena-terraform-state
  #    - Server-side encryption enabled
  #    - Versioning enabled
  #    - Secure access policies
  #
  # 2. DynamoDB Table: arena-terraform-locks
  #    - Partition key: LockID (String)
  #    - On-demand capacity mode
  #    - Point-in-time recovery enabled
}