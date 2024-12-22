# Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Random password generation for database
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# KMS key for encryption
resource "aws_kms_key" "database" {
  description             = "KMS key for Arena database encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = {
    Environment = var.environment
    Project     = "arena"
  }
}

resource "aws_kms_alias" "database" {
  name          = "alias/${var.environment}-arena-database"
  target_key_id = aws_kms_key.database.key_id
}

# RDS subnet group
resource "aws_db_subnet_group" "main" {
  name        = "${var.environment}-arena-db-subnet"
  description = "Database subnet group for Arena ${var.environment}"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Environment = var.environment
    Project     = "arena"
  }
}

# Security group for RDS
resource "aws_security_group" "db" {
  name        = "${var.environment}-arena-db-sg"
  description = "Security group for Arena database"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "PostgreSQL access from application"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Environment = var.environment
    Project     = "arena"
  }
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.environment}-arena-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS instance
resource "aws_db_instance" "main" {
  identifier     = "${var.environment}-arena-postgres"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = var.storage_encrypted
  kms_key_id           = aws_kms_key.database.arn

  db_name  = "arena"
  username = "arena_admin"
  password = random_password.db_password.result

  multi_az                     = var.environment == "production"
  backup_retention_period      = var.db_backup_retention_period
  backup_window               = var.db_backup_window
  maintenance_window          = var.db_maintenance_window
  auto_minor_version_upgrade  = var.db_auto_minor_version_upgrade
  deletion_protection         = var.deletion_protection
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${var.environment}-arena-postgres-final"

  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period
  monitoring_interval                   = var.db_monitoring_interval
  monitoring_role_arn                   = aws_iam_role.rds_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  tags = {
    Environment = var.environment
    Project     = "arena"
  }
}

# Security group for Redis
resource "aws_security_group" "redis" {
  name        = "${var.environment}-arena-redis-sg"
  description = "Security group for Arena Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "Redis access from application"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Environment = var.environment
    Project     = "arena"
  }
}

# Redis subnet group
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.environment}-arena-redis-subnet"
  description = "Redis subnet group for Arena ${var.environment}"
  subnet_ids  = var.private_subnet_ids
}

# Redis parameter group
resource "aws_elasticache_parameter_group" "redis" {
  family = "redis6.x"
  name   = "${var.environment}-arena-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
}

# Redis cluster
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.environment}-arena-redis"
  engine              = "redis"
  engine_version      = var.redis_engine_version
  node_type           = var.redis_node_type
  num_cache_nodes     = var.redis_num_cache_nodes
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  port                = 6379

  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]

  snapshot_retention_limit = var.redis_snapshot_retention_limit
  snapshot_window         = var.redis_snapshot_window
  maintenance_window      = var.redis_maintenance_window

  tags = {
    Environment = var.environment
    Project     = "arena"
  }
}

# CloudWatch alarms for RDS monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.environment}-arena-db-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = 300
  statistic          = "Average"
  threshold          = 80
  alarm_description  = "Database CPU utilization above threshold"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "database_memory" {
  alarm_name          = "${var.environment}-arena-db-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name        = "FreeableMemory"
  namespace          = "AWS/RDS"
  period             = 300
  statistic          = "Average"
  threshold          = 1000000000  # 1GB in bytes
  alarm_description  = "Database freeable memory below threshold"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
}

# Outputs
output "rds_endpoint" {
  value = {
    endpoint = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
  }
  description = "RDS instance endpoint and port"
}

output "redis_endpoint" {
  value = {
    endpoint = aws_elasticache_cluster.redis.cache_nodes[0].address
    port     = aws_elasticache_cluster.redis.cache_nodes[0].port
  }
  description = "Redis cluster endpoint and port"
}

output "monitoring_role_arn" {
  value       = aws_iam_role.rds_monitoring.arn
  description = "ARN of the RDS monitoring IAM role"
}