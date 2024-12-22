# Arena MVP Security Module Variables
# Terraform version: >=1.5.0
# Module: Security (WAF, Security Groups, IAM, SSL)

# Environment variable to determine deployment context and security configurations
variable "environment" {
  description = "Deployment environment (development, staging, production) for security resource configuration"
  type        = string
  
  validation {
    condition     = can(regex("^(development|staging|production)$", var.environment))
    error_message = "Environment must be development, staging, or production"
  }
}

# VPC ID for security group association and network controls
variable "vpc_id" {
  description = "ID of the VPC where security groups and network controls will be created"
  type        = string
  
  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must be valid AWS VPC identifier starting with vpc-"
  }
}

# Domain name for SSL certificate generation and security configurations
variable "domain_name" {
  description = "Primary domain name for SSL certificate generation and security configurations"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be valid FQDN format (e.g., arena-mvp.com)"
  }
}

# WAF rate limiting configuration for DDoS protection
variable "waf_rate_limit" {
  description = "Request rate limit per IP address for WAF rules (requests per minute)"
  type        = number
  default     = 100
  
  validation {
    condition     = var.waf_rate_limit >= 10 && var.waf_rate_limit <= 1000
    error_message = "WAF rate limit must be between 10 and 1000 requests per IP per minute"
  }
}

# Allowed IP ranges for security group ingress rules
variable "allowed_ip_ranges" {
  description = "List of CIDR blocks allowed to access application through security groups"
  type        = list(string)
  default     = ["0.0.0.0/0"]
  
  validation {
    condition     = alltrue([for cidr in var.allowed_ip_ranges : can(cidrhost(cidr, 0))])
    error_message = "All IP ranges must be valid CIDR blocks (e.g., 10.0.0.0/16)"
  }
}

# Resource tagging configuration for security resources
variable "tags" {
  description = "Resource tags to apply to all security resources for tracking and management"
  type        = map(string)
  default = {
    Project       = "Arena"
    ManagedBy     = "Terraform"
    SecurityLevel = "High"
  }
}