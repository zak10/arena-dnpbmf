# Terraform Development Environment Variables
# Version: 1.5.0+
# Purpose: Define development-specific variable overrides for Arena MVP infrastructure

# Environment identifier
variable "environment" {
  type        = string
  description = "Deployment environment name"
  default     = "development"
}

# AWS Region configuration
variable "region" {
  type        = string
  description = "AWS region for development deployment"
  default     = "us-east-1"
}

# Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for development VPC"
  default     = "10.0.0.0/16"
}

# ECS container configurations
variable "ecs_container_cpu" {
  type        = number
  description = "CPU units for development ECS tasks (256 = 0.25 vCPU)"
  default     = 256
}

variable "ecs_container_memory" {
  type        = number
  description = "Memory allocation for development ECS tasks in MiB"
  default     = 512
}

variable "ecs_min_capacity" {
  type        = number
  description = "Minimum number of ECS tasks for development environment"
  default     = 1
}

variable "ecs_max_capacity" {
  type        = number
  description = "Maximum number of ECS tasks for development environment"
  default     = 2
}

# Database configurations
variable "database_instance_class" {
  type        = string
  description = "RDS instance class for development database"
  default     = "db.t3.small"
}

variable "db_multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for RDS in development"
  default     = false
}

variable "db_backup_retention_days" {
  type        = number
  description = "Number of days to retain database backups in development"
  default     = 3
}

# Cache configurations
variable "redis_node_type" {
  type        = string
  description = "ElastiCache Redis node type for development caching"
  default     = "cache.t3.micro"
}

# Domain configuration
variable "domain_name" {
  type        = string
  description = "Domain name for development environment"
  default     = "dev.arena-mvp.io"
}

# Resource protection configurations
variable "enable_deletion_protection" {
  type        = bool
  description = "Enable deletion protection for development resources"
  default     = false
}