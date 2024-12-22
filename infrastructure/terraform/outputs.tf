# Arena MVP Infrastructure Outputs
# Version: 1.5.0
# Purpose: Define outputs for critical infrastructure components

# VPC and Networking Outputs
output "vpc_id" {
  description = "ID of the VPC hosting the Arena application infrastructure"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs for application tier resources across multiple AZs"
  value       = module.networking.private_subnet_ids
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for load balancers and public-facing resources"
  value       = module.networking.public_subnet_ids
}

output "alb_security_group_id" {
  description = "ID of the Application Load Balancer security group controlling inbound traffic"
  value       = module.networking.security_group_ids["alb"]
}

output "app_security_group_id" {
  description = "ID of the application security group controlling ECS task network access"
  value       = module.networking.security_group_ids["app"]
}

output "vpc_endpoints_security_group_id" {
  description = "ID of the security group controlling VPC endpoint access"
  value       = module.networking.security_group_ids["vpc_endpoints"]
}

# ECS Cluster and Service Outputs
output "ecs_cluster_id" {
  description = "ID of the ECS cluster hosting Arena application containers"
  value       = module.compute.cluster_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster for Arena application"
  value       = module.compute.service_name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition for Arena application"
  value       = module.compute.task_definition_arn
}

output "ecs_execution_role_arn" {
  description = "ARN of the IAM role used for ECS task execution"
  value       = module.compute.execution_role_arn
}

output "ecs_task_role_arn" {
  description = "ARN of the IAM role used by running ECS tasks"
  value       = module.compute.task_role_arn
}

# Networking Configuration Outputs
output "vpc_cidr" {
  description = "CIDR block of the VPC for network planning and security configuration"
  value       = module.networking.vpc_cidr
}

# Tags Output for Resource Management
output "resource_tags" {
  description = "Common tags applied to all infrastructure resources"
  value = {
    Application = "arena-mvp"
    Environment = var.environment
    ManagedBy   = "terraform"
    Version     = "1.5.0"
  }
}

# Service Discovery Outputs
output "service_discovery_namespace" {
  description = "Service discovery namespace for internal service communication"
  value       = "${var.environment}.arena.local"
}

# Monitoring and Logging Configuration
output "cloudwatch_log_group_prefix" {
  description = "Prefix for CloudWatch log groups used by the application"
  value       = "/aws/arena/${var.environment}"
}