# Terraform v1.5.0+

variable "environment" {
  type        = string
  description = "Deployment environment name (development, staging, production)"
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

variable "app_name" {
  type        = string
  description = "Name of the application used for resource naming"
  default     = "arena"
}

variable "cpu" {
  type        = number
  description = "CPU units for ECS tasks (1024 = 1 vCPU)"
  default     = 512
  validation {
    condition     = var.cpu >= 256 && var.cpu <= 4096
    error_message = "CPU units must be between 256 and 4096"
  }
}

variable "memory" {
  type        = number
  description = "Memory allocation in MB for ECS tasks"
  default     = 1024
  validation {
    condition     = var.memory >= 512 && var.memory <= 8192
    error_message = "Memory must be between 512MB and 8192MB"
  }
}

variable "desired_count" {
  type        = number
  description = "Desired number of ECS tasks to run"
  default     = 2
  validation {
    condition     = var.desired_count >= 1
    error_message = "Desired count must be at least 1"
  }
}

variable "container_image" {
  type        = string
  description = "Docker image to run in the ECS task"
  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9._-]*/[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$", var.container_image))
    error_message = "Container image must be a valid Docker image reference"
  }
}

variable "container_port" {
  type        = number
  description = "Port exposed by the container"
  default     = 8000
  validation {
    condition     = var.container_port > 0 && var.container_port < 65536
    error_message = "Container port must be between 1 and 65535"
  }
}

variable "health_check_path" {
  type        = string
  description = "Path for container health check"
  default     = "/health"
}

variable "health_check_interval" {
  type        = number
  description = "Interval between health checks in seconds"
  default     = 30
  validation {
    condition     = var.health_check_interval >= 5 && var.health_check_interval <= 300
    error_message = "Health check interval must be between 5 and 300 seconds"
  }
}

variable "health_check_timeout" {
  type        = number
  description = "Health check timeout in seconds"
  default     = 5
  validation {
    condition     = var.health_check_timeout >= 2 && var.health_check_timeout <= 60
    error_message = "Health check timeout must be between 2 and 60 seconds"
  }
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for ECS tasks"
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least two private subnets are required for high availability"
  }
}

variable "app_security_group_id" {
  type        = string
  description = "Security group ID for ECS tasks"
  validation {
    condition     = can(regex("^sg-", var.app_security_group_id))
    error_message = "Security group ID must be valid"
  }
}

variable "autoscaling_min_capacity" {
  type        = number
  description = "Minimum number of ECS tasks for auto-scaling"
  default     = 2
  validation {
    condition     = var.autoscaling_min_capacity >= 1
    error_message = "Minimum capacity must be at least 1"
  }
}

variable "autoscaling_max_capacity" {
  type        = number
  description = "Maximum number of ECS tasks for auto-scaling"
  default     = 8
  validation {
    condition     = var.autoscaling_max_capacity >= var.autoscaling_min_capacity
    error_message = "Maximum capacity must be greater than or equal to minimum capacity"
  }
}

variable "cpu_threshold" {
  type        = number
  description = "CPU utilization threshold percentage for auto-scaling"
  default     = 70
  validation {
    condition     = var.cpu_threshold > 0 && var.cpu_threshold <= 100
    error_message = "CPU threshold must be between 1 and 100"
  }
}