# Arena MVP Security Infrastructure Module
# AWS Provider Version: ~> 4.0

# Local variables for enhanced configuration management
locals {
  # Common tags to be applied to all resources
  common_tags = merge(var.tags, {
    Module  = "security"
    Purpose = "Security Infrastructure"
  })

  # WAF rule configuration
  waf_rules = {
    rate_limit = {
      name     = "RateLimitRule"
      priority = 1
      limit    = var.environment == "production" ? 2000 : 1000
    }
    ip_reputation = {
      name     = "IPReputationRule"
      priority = 2
    }
    sql_injection = {
      name     = "SQLInjectionRule"
      priority = 3
    }
    xss = {
      name     = "XSSProtectionRule"
      priority = 4
    }
  }
}

# WAF Web ACL with comprehensive protection rules
resource "aws_wafv2_web_acl" "arena_waf" {
  name        = "arena-${var.environment}-waf"
  description = "WAF ACL for Arena ${var.environment} environment"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = local.waf_rules.rate_limit.name
    priority = local.waf_rules.rate_limit.priority

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = local.waf_rules.rate_limit.limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitMetric"
      sampled_requests_enabled  = true
    }
  }

  # SQL Injection protection rule
  rule {
    name     = local.waf_rules.sql_injection.name
    priority = local.waf_rules.sql_injection.priority

    override_action {
      none {}
    }

    statement {
      sql_injection_match_statement {
        field_to_match {
          body {}
          query_string {}
          uri_path {}
        }
        text_transformation {
          priority = 1
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 2
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "SQLInjectionMetric"
      sampled_requests_enabled  = true
    }
  }

  # XSS protection rule
  rule {
    name     = local.waf_rules.xss.name
    priority = local.waf_rules.xss.priority

    override_action {
      none {}
    }

    statement {
      xss_match_statement {
        field_to_match {
          body {}
          query_string {}
          uri_path {}
        }
        text_transformation {
          priority = 1
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 2
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "XSSMetric"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "ArenaWAFMetric"
    sampled_requests_enabled  = true
  }

  tags = local.common_tags
}

# Application Security Group with granular rules
resource "aws_security_group" "arena_app" {
  name        = "arena-${var.environment}-app-sg"
  description = "Security group for Arena application containers"
  vpc_id      = var.vpc_id

  # Allow inbound HTTPS from ALB
  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  # Allow inbound HTTP for health checks
  ingress {
    description     = "HTTP for health checks"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  # Allow outbound HTTPS
  egress {
    description = "HTTPS to internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow outbound PostgreSQL
  egress {
    description     = "PostgreSQL access"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.db_security_group_id]
  }

  # Allow outbound Redis
  egress {
    description     = "Redis access"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.redis_security_group_id]
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

# SSL Certificate with automated DNS validation
resource "aws_acm_certificate" "arena_cert" {
  domain_name               = var.domain_name
  validation_method         = "DNS"
  subject_alternative_names = ["*.${var.domain_name}"]

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

# Application IAM Role with least privilege access
resource "aws_iam_role" "arena_app" {
  name = "arena-${var.environment}-app-role"

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

  # Attach required policies
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
  ]

  # Custom policy for additional permissions
  inline_policy {
    name = "arena-app-permissions"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect = "Allow"
          Action = [
            "ses:SendEmail",
            "ses:SendRawEmail"
          ]
          Resource = "*"
        },
        {
          Effect = "Allow"
          Action = [
            "secretsmanager:GetSecretValue"
          ]
          Resource = [
            "arn:aws:secretsmanager:${var.region}:${var.account_id}:secret:arena-${var.environment}-*"
          ]
        }
      ]
    })
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

# Export resource ARNs and IDs
output "waf_acl_arn" {
  description = "ARN of the WAF ACL"
  value       = aws_wafv2_web_acl.arena_waf.arn
}

output "app_security_group_id" {
  description = "ID of the application security group"
  value       = aws_security_group.arena_app.id
}

output "ssl_certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = aws_acm_certificate.arena_cert.arn
}

output "app_role_arn" {
  description = "ARN of the application IAM role"
  value       = aws_iam_role.arena_app.arn
}