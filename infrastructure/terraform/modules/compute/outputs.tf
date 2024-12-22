# Output definitions for the compute module
# Exports ECS cluster, service and task-related resources for use by other modules

# ECS Cluster outputs
output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

# ECS Service outputs
output "service_id" {
  description = "ID of the ECS service"
  value       = aws_ecs_service.main.id
}

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.main.name
}

output "service_desired_count" {
  description = "Desired number of tasks for the ECS service"
  value       = aws_ecs_service.main.desired_count
}

# Multi-AZ deployment configuration
output "service_subnets" {
  description = "Subnet IDs where the ECS service tasks are deployed"
  value       = aws_ecs_service.main.network_configuration[0].subnets
}

# Health check configuration
output "health_check_grace_period" {
  description = "Health check grace period in seconds for the ECS service"
  value       = aws_ecs_service.main.health_check_grace_period_seconds
}