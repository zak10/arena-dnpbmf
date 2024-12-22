# Environment Identification
environment = "development"
region     = "us-east-1"

# Networking Configuration
vpc_cidr = "10.0.0.0/16"

# Domain Configuration
domain_name = "arena-dev.io"

# ECS Container Configuration
# Minimal resource allocation for development workloads
ecs_container_cpu    = 256  # 0.25 vCPU
ecs_container_memory = 512  # 512 MB RAM
ecs_min_capacity     = 1    # Minimum running tasks
ecs_max_capacity     = 2    # Maximum tasks for auto-scaling

# Database Configuration
# Cost-effective RDS instance for development
database_instance_class    = "db.t3.small"
db_backup_retention_days  = 3
enable_deletion_protection = false

# Redis Cache Configuration
# Minimal cache instance for development
redis_node_type = "cache.t3.micro"

# Additional Development-specific Settings
# These settings are intentionally relaxed for development purposes
enable_multi_az          = false  # Single AZ deployment for dev
enable_performance_insights = false
enable_enhanced_monitoring = false

# Development Security Group Rules
# Note: These should be more restrictive in production
allow_dev_access_cidrs = [
  "10.0.0.0/16",  # VPC CIDR
  "0.0.0.0/0"     # Allow all for development (restrict in production)
]

# Development Tags
additional_tags = {
  Environment = "development"
  ManagedBy   = "terraform"
  Project     = "arena-mvp"
}

# Monitoring Configuration
# Basic monitoring settings for development
alarm_evaluation_periods = 2
alarm_period            = 300  # 5 minutes
cpu_utilization_threshold = 80
memory_utilization_threshold = 80

# S3 Bucket Configuration
# Development bucket settings
enable_versioning = false
enable_encryption = true
force_destroy     = true  # Allows bucket deletion with contents