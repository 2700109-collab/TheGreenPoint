###############################################################################
# Database Module – Variables
###############################################################################

variable "name_prefix" {
  description = "Prefix applied to all resource names and tags"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where resources will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for DB and cache subnet groups"
  type        = list(string)
}

variable "db_instance_class" {
  description = "RDS instance class (e.g. db.t3.medium)"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage for the RDS instance in GB"
  type        = number
  default     = 50
}

variable "db_name" {
  description = "Name of the default database to create"
  type        = string
  default     = "ncts"
}

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache node type (e.g. cache.t3.small)"
  type        = string
  default     = "cache.t3.small"
}

variable "allowed_security_groups" {
  description = "List of security group IDs permitted to access RDS and Redis"
  type        = list(string)
}
