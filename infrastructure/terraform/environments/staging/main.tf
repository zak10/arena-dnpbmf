# Terraform configuration for Arena MVP staging environment
terraform {
  required_version = ">=1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Enhanced state management with encryption and locking
  backend "s3" {
    bucket         = "arena-terraform-state-staging"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "arena-terraform-locks-staging"
    kms_key_id     = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/staging-terraform-key"
  }
}

# AWS Provider configuration with comprehensive tagging
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project       = "Arena"
      Environment   = "staging"
      ManagedBy    = "Terraform"
      CostCenter   = "PreProduction"
      SecurityLevel = "High"
    }
  }
}

# Local variables for staging-specific configurations
locals {
  staging_config = {
    # Single AZ deployment for staging
    vpc_cidr         = "10.1.0.0/16"
    azs              = ["us-east-1a"]
    private_subnets  = ["10.1.1.0/24"]
    public_subnets   = ["10.1.2.0/24"]

    # Limited compute resources for staging
    container_cpu    = 256
    container_memory = 512
    min_capacity    = 1
    max_capacity    = 2

    # Optimized database instances for staging
    db_instance_class    = "db.t3.medium"
    redis_node_type      = "cache.t3.micro"
    backup_retention_days = 7
    monitoring_interval  = 60
  }
}

# Networking module for staging environment
module "networking" {
  source = "../../modules/networking"

  environment         = "staging"
  vpc_cidr           = local.staging_config.vpc_cidr
  availability_zones = local.staging_config.azs
  private_subnet_cidrs = local.staging_config.private_subnets
  public_subnet_cidrs  = local.staging_config.public_subnets
  enable_nat_gateway   = true
  
  vpc_flow_logs_retention = 30
  
  tags = {
    Environment = "staging"
    Purpose     = "Arena MVP Staging Network"
  }
}

# Compute module for staging environment
module "compute" {
  source = "../../modules/compute"

  environment = "staging"
  app_name    = "arena"
  
  cpu         = local.staging_config.container_cpu
  memory      = local.staging_config.container_memory
  
  desired_count = local.staging_config.min_capacity
  container_image = "arena/app:staging"
  container_port  = 3000
  
  private_subnet_ids     = module.networking.private_subnet_ids
  app_security_group_id  = module.networking.security_group_ids["app"]
  
  autoscaling_min_capacity = local.staging_config.min_capacity
  autoscaling_max_capacity = local.staging_config.max_capacity
  cpu_threshold            = 70

  health_check_path     = "/health"
  health_check_interval = 30
  health_check_timeout  = 5
}

# Database module for staging environment
module "database" {
  source = "../../modules/database"

  environment = "staging"
  vpc_id      = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids

  # RDS Configuration
  db_instance_class    = local.staging_config.db_instance_class
  db_allocated_storage = 20
  db_max_allocated_storage = 100
  db_backup_retention_period = local.staging_config.backup_retention_days
  db_monitoring_interval    = local.staging_config.monitoring_interval
  
  # Redis Configuration
  redis_node_type = local.staging_config.redis_node_type
  redis_num_cache_nodes = 1
  redis_snapshot_retention_limit = local.staging_config.backup_retention_days

  # Security Configuration
  storage_encrypted = true
  deletion_protection = true
  performance_insights_enabled = true
  performance_insights_retention_period = 7
}

# Outputs for reference
output "vpc_id" {
  value       = module.networking.vpc_id
  description = "ID of the staging VPC"
}

output "ecs_cluster_id" {
  value       = module.compute.cluster_id
  description = "ID of the ECS cluster"
}

output "database_endpoints" {
  value = {
    rds = module.database.rds_endpoint
    redis = module.database.redis_endpoint
  }
  description = "Database endpoints for application configuration"
  sensitive   = true
}