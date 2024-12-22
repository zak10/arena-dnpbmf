# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Get current AWS region
data "aws_region" "current" {}

# ECS Cluster with container insights enabled
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = var.environment
    Terraform   = "true"
    Application = var.app_name
  }
}

# Enable CloudWatch Container Insights for enhanced monitoring
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
    base            = 1
  }
}

# ECS Task Definition with enhanced security and monitoring
resource "aws_ecs_task_definition" "main" {
  family                   = "${var.app_name}-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = var.cpu
  memory                  = var.memory
  execution_role_arn      = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name         = var.app_name
      image        = var.container_image
      essential    = true
      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}${var.health_check_path} || exit 1"]
        interval    = var.health_check_interval
        timeout     = var.health_check_timeout
        retries     = 3
        startPeriod = 60
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/${var.app_name}-${var.environment}"
          awslogs-region        = data.aws_region.current.name
          awslogs-stream-prefix = "ecs"
          awslogs-create-group  = "true"
        }
      }
      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        }
      ]
    }
  ])

  tags = {
    Environment = var.environment
    Terraform   = "true"
    Application = var.app_name
  }
}

# ECS Service with auto-scaling and enhanced health checks
resource "aws_ecs_service" "main" {
  name                   = "${var.app_name}-${var.environment}"
  cluster               = aws_ecs_cluster.main.id
  task_definition       = aws_ecs_task_definition.main.arn
  desired_count         = var.desired_count
  launch_type           = "FARGATE"
  force_new_deployment  = true
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.app_security_group_id]
    assign_public_ip = false
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_configuration {
    minimum_healthy_percent = 100
    maximum_percent        = 200
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Environment = var.environment
    Terraform   = "true"
    Application = var.app_name
  }
}

# Auto-scaling configuration
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# CPU-based auto-scaling policy
resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.app_name}-${var.environment}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# IAM role for ECS task execution
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.app_name}-${var.environment}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Terraform   = "true"
    Application = var.app_name
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM role for ECS tasks with minimal permissions
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.app_name}-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Terraform   = "true"
    Application = var.app_name
  }
}

# Outputs for use in other modules
output "cluster_id" {
  value       = aws_ecs_cluster.main.id
  description = "The ID of the ECS cluster"
}

output "service_name" {
  value       = aws_ecs_service.main.name
  description = "The name of the ECS service"
}

output "task_definition_arn" {
  value       = aws_ecs_task_definition.main.arn
  description = "The ARN of the task definition"
}

output "execution_role_arn" {
  value       = aws_iam_role.ecs_execution_role.arn
  description = "The ARN of the ECS execution role"
}

output "task_role_arn" {
  value       = aws_iam_role.ecs_task_role.arn
  description = "The ARN of the ECS task role"
}