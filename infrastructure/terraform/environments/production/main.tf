# Arena MVP Production Environment Configuration
# Terraform version: >=1.5.0
# AWS Provider version: ~> 5.0

# Configure required providers
terraform {
  required_version = ">=1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Production should use remote state storage
  backend "s3" {
    bucket         = "arena-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "arena-terraform-locks"
  }
}

# Local variables for environment configuration
locals {
  environment = "production"
  region     = "us-east-1"
  
  # Production VPC configuration
  vpc_cidr = "10.0.0.0/16"
  azs      = ["us-east-1a", "us-east-1b", "us-east-1c"]
  
  # Subnet CIDR blocks
  private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnet_cidrs  = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  
  # Common tags for all resources
  tags = {
    Environment = local.environment
    Project     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# Networking module for VPC and subnet configuration
module "networking" {
  source = "../../modules/networking"

  environment          = local.environment
  vpc_cidr            = local.vpc_cidr
  availability_zones  = local.azs
  private_subnet_cidrs = local.private_subnet_cidrs
  public_subnet_cidrs  = local.public_subnet_cidrs
  enable_nat_gateway   = true
  
  # Production requires multi-AZ NAT gateways for high availability
  single_nat_gateway   = false
  
  vpc_flow_logs_retention = 30
  tags                    = local.tags
}

# Compute module for ECS cluster and services
module "compute" {
  source = "../../modules/compute"

  environment           = local.environment
  app_name             = "arena"
  vpc_id               = module.networking.vpc_id
  private_subnet_ids   = module.networking.private_subnet_ids
  app_security_group_id = module.networking.security_group_ids.app

  # Production compute configuration
  cpu                     = 1024
  memory                  = 2048
  desired_count           = 2
  autoscaling_min_capacity = 2
  autoscaling_max_capacity = 8
  container_port          = 8000
  health_check_path      = "/health"
  health_check_interval  = 30
  
  # Container configuration
  container_image        = "arena/api:latest"
  enable_auto_scaling    = true
  cpu_threshold         = 70

  tags = local.tags
}

# Database module for RDS and ElastiCache
module "database" {
  source = "../../modules/database"

  environment         = local.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids

  # Production database configuration
  db_instance_class          = "db.t3.large"
  db_allocated_storage       = 100
  db_max_allocated_storage   = 500
  db_multi_az               = true
  db_backup_retention_period = 30
  deletion_protection       = true
  storage_encrypted        = true
  
  # Performance monitoring
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  db_monitoring_interval     = 60

  # Redis configuration
  redis_node_type          = "cache.t3.medium"
  redis_num_cache_nodes    = 2
  redis_snapshot_retention_limit = 7

  tags = local.tags
}

# Monitoring module for observability
module "monitoring" {
  source = "../../modules/monitoring"

  environment         = local.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids

  # Production monitoring configuration
  retention_days        = 30
  api_latency_threshold = 2000  # 2 seconds as per requirements
  xray_sampling_rate    = 0.1
  alert_email          = "alerts@arena.com"

  tags = local.tags
}

# Outputs for reference by other configurations
output "vpc_id" {
  value       = module.networking.vpc_id
  description = "ID of the production VPC"
}

output "ecs_cluster_id" {
  value       = module.compute.cluster_id
  description = "ID of the production ECS cluster"
}

output "rds_endpoint" {
  value       = module.database.rds_endpoint
  description = "Endpoint of the production RDS instance"
  sensitive   = true
}

output "redis_endpoint" {
  value       = module.database.redis_endpoint
  description = "Endpoint of the production Redis cluster"
  sensitive   = true
}