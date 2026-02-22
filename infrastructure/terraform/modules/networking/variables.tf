variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "List of availability zones to deploy subnets into"
  type        = list(string)
}

variable "environment" {
  description = "Environment name (e.g. dev, staging, production)"
  type        = string
}
