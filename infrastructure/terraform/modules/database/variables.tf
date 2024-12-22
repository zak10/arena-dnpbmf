# Environment configuration
variable "environment" {
  type        = string
  description = "Deployment environment (development, staging, production)"
  validation {
    condition     = can(regex("^(development|staging|production)$", var.environment))
    error_message = "Environment must be development, staging, or production"
  }
}

# Networking configuration
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where database resources will be deployed"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for database subnet groups"
}

# PostgreSQL RDS Configuration
variable "db_engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  default     = "14.7"
  validation {
    condition     = can(regex("^14\\.[0-9]+$", var.db_engine_version))
    error_message = "PostgreSQL engine version must be 14.x"
  }
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.medium"
  validation {
    condition     = can(regex("^db\\.(t3|r5|r6g)\\.(medium|large|xlarge|2xlarge)$", var.db_instance_class))
    error_message = "Invalid RDS instance class. Must be t3, r5, or r6g series"
  }
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage in GB for RDS instance"
  default     = 20
  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 16384
    error_message = "Allocated storage must be between 20GB and 16TB"
  }
}

variable "db_max_allocated_storage" {
  type        = number
  description = "Maximum storage in GB for RDS autoscaling"
  default     = 100
  validation {
    condition     = var.db_max_allocated_storage >= var.db_allocated_storage
    error_message = "Maximum allocated storage must be greater than or equal to allocated storage"
  }
}

variable "db_backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 7
  validation {
    condition     = var.db_backup_retention_period >= 7 && var.db_backup_retention_period <= 35
    error_message = "Backup retention period must be between 7 and 35 days"
  }
}

variable "db_backup_window" {
  type        = string
  description = "Preferred backup window in UTC (Format: hh24:mi-hh24:mi)"
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  type        = string
  description = "Preferred maintenance window in UTC (Format: ddd:hh24:mi-ddd:hh24:mi)"
  default     = "Mon:04:00-Mon:05:00"
}

variable "db_auto_minor_version_upgrade" {
  type        = bool
  description = "Enable automatic minor version upgrades during maintenance window"
  default     = true
}

variable "db_monitoring_interval" {
  type        = number
  description = "Enhanced Monitoring interval in seconds (0 to disable)"
  default     = 60
  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.db_monitoring_interval)
    error_message = "Monitoring interval must be 0, 1, 5, 10, 15, 30, or 60"
  }
}

variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection for RDS instance"
  default     = true
}

variable "storage_encrypted" {
  type        = bool
  description = "Enable storage encryption for RDS instance"
  default     = true
}

variable "performance_insights_enabled" {
  type        = bool
  description = "Enable Performance Insights for RDS monitoring"
  default     = true
}

variable "performance_insights_retention_period" {
  type        = number
  description = "Performance Insights retention period in days"
  default     = 7
  validation {
    condition     = contains([7, 31, 62, 93, 124, 155, 186, 217, 248, 279, 310, 341, 372, 403, 434, 465, 496, 527, 558, 589, 620, 651, 682, 713, 731], var.performance_insights_retention_period)
    error_message = "Performance Insights retention must be 7 days or monthly increments up to 24 months"
  }
}

# Redis ElastiCache Configuration
variable "redis_engine_version" {
  type        = string
  description = "Redis engine version"
  default     = "6.x"
  validation {
    condition     = can(regex("^6\\.[0-9x]+$", var.redis_engine_version))
    error_message = "Redis engine version must be 6.x"
  }
}

variable "redis_node_type" {
  type        = string
  description = "ElastiCache node type"
  default     = "cache.t3.medium"
  validation {
    condition     = can(regex("^cache\\.(t3|r5|r6g)\\.(micro|small|medium|large|xlarge)$", var.redis_node_type))
    error_message = "Invalid Redis node type. Must be t3, r5, or r6g series"
  }
}

variable "redis_num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the Redis cluster"
  default     = 1
  validation {
    condition     = var.redis_num_cache_nodes >= 1 && var.redis_num_cache_nodes <= 6
    error_message = "Number of cache nodes must be between 1 and 6"
  }
}

variable "redis_snapshot_retention_limit" {
  type        = number
  description = "Number of days to retain Redis snapshots"
  default     = 7
  validation {
    condition     = var.redis_snapshot_retention_limit >= 0 && var.redis_snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 0 and 35 days"
  }
}

variable "redis_snapshot_window" {
  type        = string
  description = "Daily time range when Redis snapshots are created"
  default     = "03:00-04:00"
}

variable "redis_maintenance_window" {
  type        = string
  description = "Weekly time range for Redis maintenance"
  default     = "Mon:04:00-Mon:05:00"
}