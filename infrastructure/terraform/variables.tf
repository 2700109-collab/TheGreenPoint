# ═══════════════════════════════════════════════════════════════
# NCTS Terraform Variables
# ═══════════════════════════════════════════════════════════════

# ── General ───────────────────────────────────────────────────
variable "environment" {
  description = "Deployment environment (staging or production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "region" {
  description = "AWS region — must be af-south-1 for SA data residency"
  type        = string
  default     = "af-south-1"
}

variable "domain" {
  description = "Root domain for NCTS"
  type        = string
  default     = "ncts.gov.za"
}

variable "certificate_arn" {
  description = "ACM certificate ARN for TLS (must be in af-south-1 for ALB, us-east-1 for CloudFront)"
  type        = string
  default     = ""
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = "ops@ncts.gov.za"
}

# ── Networking ────────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ── Database ──────────────────────────────────────────────────
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "db_allocated_storage" {
  description = "RDS storage in GB (gp3)"
  type        = number
  default     = 100
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "ncts_admin"
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

# ── Compute ───────────────────────────────────────────────────
variable "api_desired_count" {
  description = "Desired number of ECS API tasks"
  type        = number
  default     = 2
}

variable "api_cpu" {
  description = "API task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 2048
}

variable "api_memory" {
  description = "API task memory in MB"
  type        = number
  default     = 4096
}
