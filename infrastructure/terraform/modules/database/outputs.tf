###############################################################################
# Database Module – Outputs
###############################################################################

output "rds_endpoint" {
  description = "Connection endpoint for the RDS PostgreSQL instance"
  value       = aws_db_instance.this.endpoint
}

output "rds_instance_id" {
  description = "Identifier of the RDS instance"
  value       = aws_db_instance.this.id
}

output "redis_endpoint" {
  description = "Primary endpoint for the ElastiCache Redis replication group"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "redis_cluster_id" {
  description = "ID of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.this.id
}

output "database_url_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the database URL"
  value       = aws_secretsmanager_secret.database_url.arn
}

output "redis_url_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the Redis URL"
  value       = aws_secretsmanager_secret.redis_url.arn
}
