variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, production)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "api_desired_count" {
  description = "Desired number of ECS tasks for the API service"
  type        = number
}

variable "api_cpu" {
  description = "CPU units for the API task definition (1024 = 1 vCPU)"
  type        = number
}

variable "api_memory" {
  description = "Memory (MiB) for the API task definition"
  type        = number
}

variable "ecr_repository_url" {
  description = "ECR repository URL for the API container image"
  type        = string
}

variable "database_url_arn" {
  description = "ARN of the Secrets Manager secret containing the database URL"
  type        = string
}

variable "redis_url_arn" {
  description = "ARN of the Secrets Manager secret containing the Redis URL"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 documents bucket"
  type        = string
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
}
