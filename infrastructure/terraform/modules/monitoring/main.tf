# AWS Provider version: ~> 5.0
# Purpose: Terraform configuration for comprehensive monitoring infrastructure

# KMS key for encrypting monitoring data
resource "aws_kms_key" "monitoring" {
  description             = "KMS key for Arena ${var.environment} monitoring encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# CloudWatch Log Group for application logs
resource "aws_cloudwatch_log_group" "application" {
  name              = "/arena/${var.environment}/application"
  retention_in_days = var.retention_days
  kms_key_id        = aws_kms_key.monitoring.arn

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# CloudWatch Log Group for Prometheus logs
resource "aws_cloudwatch_log_group" "prometheus" {
  name              = "/arena/${var.environment}/prometheus"
  retention_in_days = var.retention_days
  kms_key_id        = aws_kms_key.monitoring.arn

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# Managed Prometheus Workspace
resource "aws_prometheus_workspace" "arena" {
  alias = "arena-${var.environment}"

  logging_configuration {
    log_group_arn = aws_cloudwatch_log_group.prometheus.arn
  }

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# Security group for Grafana workspace
resource "aws_security_group" "grafana" {
  name_prefix = "arena-grafana-${var.environment}"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# Managed Grafana Workspace
resource "aws_grafana_workspace" "arena" {
  name                  = "arena-${var.environment}"
  account_access_type   = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type       = "SERVICE_MANAGED"
  data_sources         = ["PROMETHEUS", "CLOUDWATCH", "XRAY", "AMAZON_OPENSEARCH_SERVICE"]

  vpc_configuration {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.grafana.id]
  }

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# X-Ray sampling rule
resource "aws_xray_sampling_rule" "arena" {
  rule_name      = "arena-${var.environment}"
  fixed_rate     = var.xray_sampling_rate
  host           = "*"
  http_method    = "*"
  url_path       = "*"
  version        = 1
  priority       = 1000
  reservoir_size = var.environment == "prod" ? 50 : 5
  service_name   = "arena-${var.environment}"
  service_type   = "*"

  attributes = {
    Environment = var.environment
  }

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "arena" {
  dashboard_name = "arena-${var.environment}"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["Arena/API", "Latency", "Environment", var.environment]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "API Latency"
          annotations = {
            horizontal = [
              {
                value = var.api_latency_threshold
                label = "Threshold"
                color = "#ff0000"
              }
            ]
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["Arena/API", "ErrorRate", "Environment", var.environment]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Error Rate"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# CloudWatch Alarm for API Latency
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "arena-${var.environment}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Latency"
  namespace           = "Arena/API"
  period             = "300"
  statistic          = "Average"
  threshold          = var.api_latency_threshold
  alarm_description  = "API latency is too high"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    Environment = var.environment
  }

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "arena-${var.environment}-alerts"

  tags = {
    Environment = var.environment
    Service     = "Arena"
    ManagedBy   = "Terraform"
  }
}

# SNS Topic subscription for email alerts
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Data source for current AWS region
data "aws_region" "current" {}