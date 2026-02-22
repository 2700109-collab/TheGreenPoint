output "documents_bucket_name" {
  description = "Name of the documents S3 bucket"
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  description = "ARN of the documents S3 bucket"
  value       = aws_s3_bucket.documents.arn
}

output "static_assets_bucket_name" {
  description = "Name of the static assets S3 bucket"
  value       = aws_s3_bucket.static_assets.id
}

output "static_assets_bucket_arn" {
  description = "ARN of the static assets S3 bucket"
  value       = aws_s3_bucket.static_assets.arn
}

output "static_assets_bucket_domain" {
  description = "Regional domain name of the static assets bucket"
  value       = aws_s3_bucket.static_assets.bucket_regional_domain_name
}

output "audit_bucket_name" {
  description = "Name of the audit archive S3 bucket"
  value       = aws_s3_bucket.audit_archive.id
}
