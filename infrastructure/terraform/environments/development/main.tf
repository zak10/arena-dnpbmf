# Terraform configuration for Arena MVP Development Environment
# Version: 1.0.0

terraform {
  required_version = ">=1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State management configuration with encryption
  backend "s3" {
    bucket         = "arena-terraform-state-dev"
    key            = "development/terraform.tfstate"
    region         = "${var.region}"
    encrypt        = true
    dynamodb_table = "arena-terraform-locks-dev"
  }
}

# AWS Provider configuration with development environment tagging
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "Arena"
      Environment = "development"
      ManagedBy   = "Terraform"
    }
  }
}

# Networking module configuration with cost-optimized settings for development
module "networking" {
  source = "../../modules/networking"

  environment         = "development"
  vpc_cidr           = "10.0.0.0/16"
  enable_nat_gateway = true
  single_nat_gateway = true  # Cost optimization for development
  enable_vpn_gateway = false

  # Development environment uses 2 AZs for cost optimization while maintaining basic HA
  availability_zones    = ["${var.region}a", "${var.region}b"]
  private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]

  vpc_flow_logs_retention = 7  # Reduced retention for development
  
  tags = {
    Purpose = "Development Environment"
  }
}

# Compute module configuration with minimal resources for development
module "compute" {
  source = "../../modules/compute"

  environment = "development"
  app_name    = "arena"
  
  # Development-specific compute settings
  cpu                     = 256  # Minimal CPU for development
  memory                  = 512  # Minimal memory for development
  desired_count           = 1    # Single instance for development
  container_port          = 3000
  health_check_path      = "/health"
  health_check_interval  = 30
  
  # Auto-scaling disabled for development
  autoscaling_min_capacity = 1
  autoscaling_max_capacity = 2
  cpu_threshold           = 75

  # Network configuration
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  app_security_group_id = module.networking.security_group_ids["app"]

  container_image = "arena/api:dev"  # Development image tag
}

# Database module configuration with minimal resources for development
module "database" {
  source = "../../modules/database"

  environment = "development"
  
  # Network configuration
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids

  # RDS configuration - minimal settings for development
  db_instance_class        = "db.t3.small"
  db_allocated_storage     = 20
  db_max_allocated_storage = 100
  db_multi_az             = false  # Single AZ for development
  db_backup_retention_period = 7
  
  # Reduced monitoring for development
  db_monitoring_interval = 60
  performance_insights_enabled = false
  deletion_protection    = false  # Disabled for development flexibility

  # Redis configuration - minimal settings for development
  redis_node_type       = "cache.t3.micro"
  redis_num_cache_nodes = 1
  redis_snapshot_retention_limit = 3  # Reduced retention for development
}

# Outputs for reference by other configurations
output "vpc_id" {
  value       = module.networking.vpc_id
  description = "Development VPC ID"
}

output "ecs_cluster_id" {
  value       = module.compute.cluster_id
  description = "Development ECS Cluster ID"
}

output "rds_endpoint" {
  value       = module.database.rds_endpoint
  description = "Development RDS endpoint"
  sensitive   = true
}

output "redis_endpoint" {
  value       = module.database.redis_endpoint
  description = "Development Redis endpoint"
  sensitive   = true
}