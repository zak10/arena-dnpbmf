# Variables for Arena MVP monitoring infrastructure configuration
# AWS Provider version: ~> 5.0

# Environment identifier for resource naming and tagging
variable "environment" {
  type        = string
  description = "Environment name (development, staging, production)"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

# Network configuration for monitoring resources
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where monitoring resources will be deployed"
}

# Configure log retention period for compliance and cost management
variable "retention_days" {
  type        = number
  description = "Number of days to retain CloudWatch logs"
  default     = 30

  validation {
    condition     = var.retention_days >= 1 && var.retention_days <= 365
    error_message = "Retention days must be between 1 and 365"
  }
}

# Configure alert notifications recipient for uptime and performance monitoring
variable "alert_email" {
  type        = string
  description = "Email address for receiving monitoring alerts"

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_email))
    error_message = "Must provide a valid email address"
  }
}

# Configure performance monitoring thresholds to meet <2s page load requirement
variable "api_latency_threshold" {
  type        = number
  description = "API latency threshold in milliseconds for alerting (SLA requirement: <2s page loads)"
  default     = 2000

  validation {
    condition     = var.api_latency_threshold >= 100 && var.api_latency_threshold <= 10000
    error_message = "API latency threshold must be between 100ms and 10000ms"
  }
}

# Configure tracing sample rate for monitoring AI processing time requirement (<5s)
variable "xray_sampling_rate" {
  type        = number
  description = "X-Ray tracing sampling rate (0-1) for monitoring API and AI processing performance"
  default     = 0.1

  validation {
    condition     = var.xray_sampling_rate >= 0 && var.xray_sampling_rate <= 1
    error_message = "Sampling rate must be between 0 and 1"
  }
}

# Configure CloudWatch metric collection interval
variable "metric_collection_interval" {
  type        = number
  description = "Interval in seconds for CloudWatch metric collection"
  default     = 60

  validation {
    condition     = contains([1, 5, 10, 30, 60], var.metric_collection_interval)
    error_message = "Metric collection interval must be one of: 1, 5, 10, 30, or 60 seconds"
  }
}

# Configure Prometheus retention period
variable "prometheus_retention_days" {
  type        = number
  description = "Number of days to retain Prometheus metrics"
  default     = 15

  validation {
    condition     = var.prometheus_retention_days >= 1 && var.prometheus_retention_days <= 90
    error_message = "Prometheus retention days must be between 1 and 90"
  }
}

# Configure Grafana admin password
variable "grafana_admin_password" {
  type        = string
  description = "Admin password for Grafana dashboard access"
  sensitive   = true

  validation {
    condition     = length(var.grafana_admin_password) >= 8
    error_message = "Grafana admin password must be at least 8 characters long"
  }
}

# Configure uptime monitoring interval
variable "uptime_check_interval" {
  type        = number
  description = "Interval in seconds between uptime checks (for 99.9% uptime SLA monitoring)"
  default     = 300

  validation {
    condition     = var.uptime_check_interval >= 60 && var.uptime_check_interval <= 900
    error_message = "Uptime check interval must be between 60 and 900 seconds"
  }
}