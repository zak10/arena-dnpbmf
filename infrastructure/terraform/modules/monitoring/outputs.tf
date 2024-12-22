# Terraform outputs for Arena MVP monitoring infrastructure
# AWS Provider version: ~> 5.0

# CloudWatch Log Group output
output "log_group_name" {
  description = "Name of the CloudWatch log group for application logs"
  value       = aws_cloudwatch_log_group.application.name
}

# Prometheus Workspace output
output "prometheus_workspace_id" {
  description = "ID of the managed Prometheus workspace"
  value       = aws_prometheus_workspace.arena.id
}

# Grafana Workspace output
output "grafana_workspace_url" {
  description = "URL of the Grafana workspace for dashboard access"
  value       = aws_grafana_workspace.arena.endpoint
}

# SNS Alert Topic output
output "alert_topic_arn" {
  description = "ARN of the SNS topic for monitoring alerts"
  value       = aws_sns_topic.alerts.arn
}

# CloudWatch Dashboard output
output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.arena.dashboard_name
}

# Additional outputs for monitoring configuration
output "metrics_namespace" {
  description = "CloudWatch metrics namespace for Arena application"
  value       = "Arena/${var.environment}"
}

output "xray_sampling_rule_name" {
  description = "Name of the X-Ray sampling rule for tracing configuration"
  value       = aws_xray_sampling_rule.arena.rule_name
}

output "log_retention_days" {
  description = "Retention period in days for CloudWatch logs"
  value       = aws_cloudwatch_log_group.application.retention_in_days
}

output "monitoring_tags" {
  description = "Tags applied to monitoring resources for identification"
  value = {
    Application = "Arena"
    Component   = "Monitoring"
    Environment = var.environment
  }
}

output "alarm_endpoints" {
  description = "Map of monitoring alarm endpoints by severity"
  value = {
    critical = aws_sns_topic.alerts.arn
    warning  = aws_sns_topic.alerts.arn
  }
}