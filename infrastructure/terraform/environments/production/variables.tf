# Terraform version constraint
terraform {
  required_version = ">=1.5.0"
}

# Environment configuration
variable "environment" {
  type        = string
  description = "Deployment environment name"
  default     = "production"
  validation {
    condition     = var.environment == "production"
    error_message = "Environment must be 'production' for this configuration"
  }
}

# Region configuration with high-availability support
variable "region" {
  type        = string
  description = "AWS region for production deployment"
  default     = "us-east-1"
  validation {
    condition     = contains(["us-east-1", "us-west-2"], var.region)
    error_message = "Region must be us-east-1 or us-west-2 for production"
  }
}

# Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for production VPC with sufficient IP space for scaling"
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

# ECS container configurations for high performance
variable "ecs_container_cpu" {
  type        = number
  description = "CPU units for production ECS tasks (1024 = 1 vCPU)"
  default     = 1024
  validation {
    condition     = var.ecs_container_cpu >= 1024
    error_message = "Production ECS tasks require minimum 1 vCPU"
  }
}

variable "ecs_container_memory" {
  type        = number
  description = "Memory allocation in MB for production ECS tasks"
  default     = 2048
  validation {
    condition     = var.ecs_container_memory >= 2048
    error_message = "Production ECS tasks require minimum 2GB memory"
  }
}

# Auto-scaling configuration for high availability
variable "ecs_min_capacity" {
  type        = number
  description = "Minimum number of ECS tasks for production high-availability"
  default     = 2
  validation {
    condition     = var.ecs_min_capacity >= 2
    error_message = "Production requires minimum 2 tasks for HA"
  }
}

variable "ecs_max_capacity" {
  type        = number
  description = "Maximum number of ECS tasks for production auto-scaling"
  default     = 8
  validation {
    condition     = var.ecs_max_capacity >= var.ecs_min_capacity * 2
    error_message = "Max capacity must be at least double min capacity"
  }
}

# Database configuration for production workloads
variable "database_instance_class" {
  type        = string
  description = "RDS instance class for production database"
  default     = "db.t3.large"
  validation {
    condition     = can(regex("^db\\.(t3|r5|m5)\\..*", var.database_instance_class))
    error_message = "Must use t3, r5, or m5 instance family for production"
  }
}

# Cache configuration for performance optimization
variable "redis_node_type" {
  type        = string
  description = "ElastiCache Redis node type for production caching"
  default     = "cache.t3.medium"
  validation {
    condition     = can(regex("^cache\\.(t3|r5|m5)\\..*", var.redis_node_type))
    error_message = "Must use t3, r5, or m5 cache node family for production"
  }
}

# Domain configuration
variable "domain_name" {
  type        = string
  description = "Production domain name for the application"
  default     = "arena.io"
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Must provide a valid domain name"
  }
}

# Security configurations
variable "enable_deletion_protection" {
  type        = bool
  description = "Enable deletion protection for production resources"
  default     = true
  validation {
    condition     = var.enable_deletion_protection == true
    error_message = "Deletion protection must be enabled in production"
  }
}

# Backup and retention configuration
variable "db_backup_retention_days" {
  type        = number
  description = "Number of days to retain production database backups"
  default     = 30
  validation {
    condition     = var.db_backup_retention_days >= 30
    error_message = "Production requires minimum 30 days backup retention"
  }
}