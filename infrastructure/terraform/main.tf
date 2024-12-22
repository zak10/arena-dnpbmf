# Arena MVP Infrastructure Configuration
# Version: 1.5.0
# Purpose: Root Terraform configuration for Arena MVP platform infrastructure

terraform {
  required_version = ">=1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state configuration with encryption and locking
  backend "s3" {
    bucket         = "arena-terraform-state"
    key            = "arena/${var.environment}/terraform.tfstate"
    region         = var.region
    encrypt        = true
    dynamodb_table = "arena-terraform-locks"
  }
}

# AWS Provider configuration with default tags
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "Arena"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "Platform Team"
    }
  }
}

# Networking Module - VPC, Subnets, Security Groups
module "networking" {
  source = "./modules/networking"

  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  
  # High availability configuration
  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production" # Use multiple NAT gateways in production

  private_subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 4, 0),
    cidrsubnet(var.vpc_cidr, 4, 1),
    cidrsubnet(var.vpc_cidr, 4, 2)
  ]
  
  public_subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 4, 4),
    cidrsubnet(var.vpc_cidr, 4, 5),
    cidrsubnet(var.vpc_cidr, 4, 6)
  ]

  vpc_flow_logs_retention = 30
  
  tags = {
    Tier = "Networking"
  }
}

# Compute Module - ECS Cluster and Services
module "compute" {
  source = "./modules/compute"

  environment = var.environment
  app_name    = "arena"

  # Container configuration
  cpu                     = var.environment == "production" ? 1024 : 512
  memory                  = var.environment == "production" ? 2048 : 1024
  desired_count           = var.environment == "production" ? 4 : 2
  container_image         = var.container_image
  container_port         = 3000
  health_check_path      = "/health"
  health_check_interval  = 30
  health_check_timeout   = 5

  # Auto-scaling configuration
  autoscaling_min_capacity = var.environment == "production" ? 2 : 1
  autoscaling_max_capacity = var.environment == "production" ? 8 : 4
  cpu_threshold            = 70

  # Network configuration
  private_subnet_ids     = module.networking.private_subnet_ids
  app_security_group_id  = module.networking.security_group_ids["app"]

  depends_on = [module.networking]
}

# Database Module - RDS and ElastiCache
module "database" {
  source = "./modules/database"

  environment        = var.environment
  vpc_id            = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids

  # RDS configuration
  db_instance_class    = var.environment == "production" ? "db.r6g.large" : "db.t3.medium"
  db_allocated_storage = var.environment == "production" ? 100 : 20
  db_max_allocated_storage = var.environment == "production" ? 1000 : 100
  
  storage_encrypted    = true
  deletion_protection = var.environment == "production"
  
  # High availability settings
  db_backup_retention_period = var.environment == "production" ? 35 : 7
  performance_insights_enabled = true
  performance_insights_retention_period = var.environment == "production" ? 731 : 7
  db_monitoring_interval = 60

  # Redis configuration
  redis_node_type = var.environment == "production" ? "cache.r6g.large" : "cache.t3.medium"
  redis_num_cache_nodes = var.environment == "production" ? 2 : 1
  redis_snapshot_retention_limit = var.environment == "production" ? 35 : 7

  depends_on = [module.networking]
}

# Outputs
output "vpc_id" {
  description = "ID of the created VPC"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = module.compute.cluster_id
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.database.rds_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.database.redis_endpoint
  sensitive   = true
}