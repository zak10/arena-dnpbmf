# Arena MVP Infrastructure Variables
# Terraform >= 1.5.0
# Last updated: 2024

# ---------------------------------------------------------------------------------------------------------------------
# REQUIRED VARIABLES
# These variables must be set in the terraform.tfvars file
# ---------------------------------------------------------------------------------------------------------------------

variable "environment" {
  type        = string
  description = "Deployment environment name (development, staging, or production)"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# OPTIONAL VARIABLES WITH DEFAULTS
# These variables have reasonable defaults for most cases
# ---------------------------------------------------------------------------------------------------------------------

variable "region" {
  type        = string
  description = "AWS region for deployment (US regions only for initial deployment)"
  default     = "us-east-1"
  
  validation {
    condition     = can(regex("^us-", var.region))
    error_message = "Only US regions are supported for initial deployment"
  }
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC (must be valid IPv4 CIDR block)"
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

variable "ecs_container_cpu" {
  type        = number
  description = "CPU units for ECS tasks (256 = 0.25 vCPU, 1024 = 1 vCPU)"
  
  # Environment-specific defaults
  default = {
    development = 512  # 0.5 vCPU
    staging     = 512  # 0.5 vCPU
    production  = 1024 # 1.0 vCPU
  }[var.environment]
  
  validation {
    condition     = var.ecs_container_cpu >= 256 && var.ecs_container_cpu <= 4096
    error_message = "CPU units must be between 256 and 4096"
  }
}

variable "ecs_container_memory" {
  type        = number
  description = "Memory allocation in MB for ECS tasks"
  
  # Environment-specific defaults
  default = {
    development = 1024 # 1GB
    staging     = 1024 # 1GB
    production  = 2048 # 2GB
  }[var.environment]
  
  validation {
    condition     = var.ecs_container_memory >= 512 && var.ecs_container_memory <= 8192
    error_message = "Memory must be between 512MB and 8192MB"
  }
}

variable "database_instance_class" {
  type        = string
  description = "RDS instance class for the database"
  
  # Environment-specific defaults
  default = {
    development = "db.t3.medium"
    staging     = "db.t3.medium"
    production  = "db.t3.large"
  }[var.environment]
  
  validation {
    condition     = can(regex("^db\\.(t3|r5|m5)\\.", var.database_instance_class))
    error_message = "Only t3, r5, or m5 instance classes are supported"
  }
}

variable "enable_deletion_protection" {
  type        = bool
  description = "Enable deletion protection for critical resources"
  sensitive   = true
  
  # Mandatory protection for production
  default = {
    development = false
    staging     = false
    production  = true
  }[var.environment]
}

variable "db_backup_retention_days" {
  type        = number
  description = "Number of days to retain database backups"
  
  # Environment-specific defaults
  default = {
    development = 7  # 1 week
    staging     = 7  # 1 week
    production  = 30 # 1 month
  }[var.environment]
  
  validation {
    condition     = var.db_backup_retention_days >= 7
    error_message = "Backup retention must be at least 7 days"
  }
}

# ---------------------------------------------------------------------------------------------------------------------
# Additional variables for future extensibility
# ---------------------------------------------------------------------------------------------------------------------

variable "tags" {
  type        = map(string)
  description = "Additional tags for all resources"
  default     = {}
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable enhanced monitoring and alerting"
  default = {
    development = false
    staging     = true
    production  = true
  }[var.environment]
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default = {
    development = false
    staging     = false
    production  = true
  }[var.environment]
}