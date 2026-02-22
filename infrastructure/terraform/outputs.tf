# ═══════════════════════════════════════════════════════════════
# NCTS Terraform Outputs
# ═══════════════════════════════════════════════════════════════

# ── Networking ────────────────────────────────────────────────
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

# ── Database ──────────────────────────────────────────────────
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.database.rds_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.database.redis_endpoint
  sensitive   = true
}

# ── Compute ───────────────────────────────────────────────────
output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.compute.alb_dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for API Docker images"
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.compute.ecs_cluster_name
}

# ── Storage ───────────────────────────────────────────────────
output "documents_bucket_name" {
  description = "S3 bucket for document storage"
  value       = module.storage.documents_bucket_name
}

output "static_assets_bucket_name" {
  description = "S3 bucket for static assets (CDN origin)"
  value       = module.storage.static_assets_bucket_name
}

# ── CDN ───────────────────────────────────────────────────────
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cdn.distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cdn.domain_name
}
