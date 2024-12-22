# Terraform AWS Provider Version: >= 4.0.0
# Terraform Version: >= 1.5.0

variable "environment" {
  type        = string
  description = "Deployment environment name with strict validation for staging"
  default     = "staging"

  validation {
    condition     = var.environment == "staging"
    error_message = "This configuration is only for staging environment"
  }
}

variable "region" {
  type        = string
  description = "AWS region for staging deployment"
  default     = "us-east-1"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for staging VPC network isolation"
  default     = "10.1.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block"
  }
}

variable "domain_name" {
  type        = string
  description = "Domain name for staging environment with SSL configuration"
  default     = "staging.arena-dev.io"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\\.[a-z0-9][a-z0-9-\\.]*[a-z0-9]$", var.domain_name))
    error_message = "Must be a valid domain name"
  }
}

variable "ecs_container_cpu" {
  type        = number
  description = "CPU units for ECS tasks in staging (1024 = 1 vCPU), optimized for staging workloads"
  default     = 512

  validation {
    condition     = var.ecs_container_cpu >= 256 && var.ecs_container_cpu <= 1024
    error_message = "CPU units must be between 256 and 1024 for staging environment"
  }
}

variable "ecs_container_memory" {
  type        = number
  description = "Memory allocation in MB for ECS tasks in staging, balanced for testing needs"
  default     = 1024

  validation {
    condition     = var.ecs_container_memory >= 512 && var.ecs_container_memory <= 2048
    error_message = "Memory must be between 512 and 2048 MB for staging environment"
  }
}

variable "ecs_min_capacity" {
  type        = number
  description = "Minimum number of ECS tasks for staging auto-scaling, limited for cost efficiency"
  default     = 1

  validation {
    condition     = var.ecs_min_capacity >= 1 && var.ecs_min_capacity <= 2
    error_message = "Minimum capacity must be between 1 and 2 for staging environment"
  }
}

variable "ecs_max_capacity" {
  type        = number
  description = "Maximum number of ECS tasks for staging auto-scaling, capped for resource control"
  default     = 4

  validation {
    condition     = var.ecs_max_capacity >= 2 && var.ecs_max_capacity <= 4
    error_message = "Maximum capacity must be between 2 and 4 for staging environment"
  }
}

variable "database_instance_class" {
  type        = string
  description = "RDS instance class for staging, optimized for testing workloads"
  default     = "db.t3.medium"

  validation {
    condition     = can(regex("^db\\.(t3|t3a)\\.(micro|small|medium)$", var.database_instance_class))
    error_message = "Must be a valid t3/t3a instance class appropriate for staging"
  }
}

variable "redis_node_type" {
  type        = string
  description = "ElastiCache Redis node type for staging, sized for development needs"
  default     = "cache.t3.small"

  validation {
    condition     = can(regex("^cache\\.(t3|t2)\\.(micro|small|medium)$", var.redis_node_type))
    error_message = "Must be a valid t2/t3 cache node type appropriate for staging"
  }
}

variable "enable_deletion_protection" {
  type        = bool
  description = "Enable deletion protection for staging resources to prevent accidental removal"
  default     = true
}

variable "db_backup_retention_days" {
  type        = number
  description = "Number of days to retain database backups in staging for data protection"
  default     = 7

  validation {
    condition     = var.db_backup_retention_days >= 1 && var.db_backup_retention_days <= 14
    error_message = "Backup retention must be between 1 and 14 days for staging environment"
  }
}

variable "db_multi_az" {
  type        = bool
  description = "Disable Multi-AZ deployment for RDS in staging to optimize costs"
  default     = false
}