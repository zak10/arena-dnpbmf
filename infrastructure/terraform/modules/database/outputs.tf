# RDS PostgreSQL outputs
output "rds_endpoint" {
  description = "RDS instance endpoint for application database connections"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS instance hostname for DNS resolution"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS instance port for database connections"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "Name of the created database for application configuration"
  value       = aws_db_instance.main.db_name
}

output "rds_master_username" {
  description = "Master username for database administration - marked sensitive to prevent exposure"
  value       = aws_db_instance.main.username
  sensitive   = true
}

# Redis ElastiCache outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint for application cache connections"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "redis_port" {
  description = "Redis cluster port for cache connections"
  value       = aws_elasticache_cluster.main.cache_nodes[0].port
}

output "redis_connection_string" {
  description = "Full Redis connection string for application configuration using format function"
  value       = format("redis://%s:%s", aws_elasticache_cluster.main.cache_nodes[0].address, aws_elasticache_cluster.main.cache_nodes[0].port)
}

# Combined outputs object for module consumers
output "database_outputs" {
  description = "Combined database connection details for application configuration"
  value = {
    rds = {
      endpoint      = aws_db_instance.main.endpoint
      address       = aws_db_instance.main.address
      port          = aws_db_instance.main.port
      database_name = aws_db_instance.main.db_name
    }
    redis = {
      endpoint            = aws_elasticache_cluster.main.cache_nodes[0].address
      port               = aws_elasticache_cluster.main.cache_nodes[0].port
      connection_string  = format("redis://%s:%s", aws_elasticache_cluster.main.cache_nodes[0].address, aws_elasticache_cluster.main.cache_nodes[0].port)
    }
  }
}

# Additional metadata outputs
output "rds_resource_id" {
  description = "The RDS resource ID for CloudWatch monitoring"
  value       = aws_db_instance.main.resource_id
}

output "rds_availability_zone" {
  description = "The availability zone where the RDS instance is deployed"
  value       = aws_db_instance.main.availability_zone
}

output "redis_cache_nodes" {
  description = "Information about the Redis cache nodes"
  value       = aws_elasticache_cluster.main.cache_nodes
}

output "redis_parameter_group_name" {
  description = "The name of the Redis parameter group"
  value       = aws_elasticache_cluster.main.parameter_group_name
}