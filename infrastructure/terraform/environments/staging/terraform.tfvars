# Environment Identification
# Used for resource tagging and naming
environment = "staging"

# Region Configuration
# US East 1 selected for cost efficiency and feature availability
region = "us-east-1"

# Network Configuration
# CIDR block allows for up to 65,536 IP addresses
vpc_cidr = "10.1.0.0/16"

# ECS Container Configuration
# Balanced resource allocation for staging workloads
ecs_container_cpu    = 1024  # 1 vCPU
ecs_container_memory = 2048  # 2GB RAM

# ECS Auto Scaling Configuration
# Limited scaling range for staging environment
ecs_min_capacity = 2  # Minimum tasks for basic HA
ecs_max_capacity = 4  # Maximum tasks for testing

# Database Configuration
# T3 medium provides good balance of performance and cost for staging
database_instance_class = "db.t3.medium"

# Redis Cache Configuration
# T3 small sufficient for staging caching needs
redis_node_type = "cache.t3.small"

# Domain Configuration
# Staging-specific subdomain
domain_name = "staging.arena-dev.io"

# Security Configuration
# Protection against accidental resource deletion
enable_deletion_protection = true

# Backup Configuration
# 7-day retention for adequate recovery window
db_backup_retention_days = 7