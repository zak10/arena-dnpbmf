# Environment Configuration
environment = "production"
region     = "us-east-1"

# Network Configuration
vpc_cidr = "10.0.0.0/16"

# Domain Configuration
domain_name = "arena.io"

# ECS Container Configuration
ecs_container_cpu    = 1024  # 1 vCPU
ecs_container_memory = 2048  # 2GB RAM
ecs_min_capacity     = 2     # Minimum 2 tasks for HA
ecs_max_capacity     = 8     # Scale up to 8 tasks

# RDS Database Configuration
database_instance_class      = "db.t3.large"
db_multi_az                 = true
db_backup_retention_days    = 30
storage_encrypted           = true
performance_insights_enabled = true
enable_deletion_protection  = true

# Redis Cache Configuration
redis_node_type               = "cache.t3.medium"
redis_num_cache_nodes         = 2
redis_snapshot_retention_limit = 7

# Security Configuration
storage_encrypted           = true
enable_deletion_protection  = true