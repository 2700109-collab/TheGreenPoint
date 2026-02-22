# ═══════════════════════════════════════════════════════════════
# NCTS Terraform Configuration
# AWS af-south-1 (Cape Town) — SA Government Data Residency
# ═══════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state in S3 with DynamoDB locking
  backend "s3" {
    bucket         = "ncts-terraform-state"
    key            = "ncts/terraform.tfstate"
    region         = "af-south-1"
    encrypt        = true
    dynamodb_table = "ncts-terraform-locks"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "NCTS"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "SAHPRA"
    }
  }
}

# ── Data Sources ──────────────────────────────────────────────
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# ── Local Values ──────────────────────────────────────────────
locals {
  name_prefix = "ncts-${var.environment}"
  azs         = slice(data.aws_availability_zones.available.names, 0, 2)

  common_tags = {
    Project     = "NCTS"
    Environment = var.environment
  }
}

# ── Modules ───────────────────────────────────────────────────

module "networking" {
  source = "./modules/networking"

  name_prefix = local.name_prefix
  vpc_cidr    = var.vpc_cidr
  azs         = local.azs
  environment = var.environment
}

module "security" {
  source = "./modules/security"

  name_prefix = local.name_prefix
  environment = var.environment
  vpc_id      = module.networking.vpc_id
  alb_arn     = module.compute.alb_arn
}

module "database" {
  source = "./modules/database"

  name_prefix          = local.name_prefix
  environment          = var.environment
  vpc_id               = module.networking.vpc_id
  private_subnet_ids   = module.networking.private_subnet_ids
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_name              = "ncts_${var.environment}"
  db_username          = var.db_username
  redis_node_type      = var.redis_node_type
  allowed_security_groups = [module.compute.ecs_security_group_id]
}

module "storage" {
  source = "./modules/storage"

  name_prefix = local.name_prefix
  environment = var.environment
  region      = var.region
}

module "compute" {
  source = "./modules/compute"

  name_prefix        = local.name_prefix
  environment        = var.environment
  region             = var.region
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  private_subnet_ids = module.networking.private_subnet_ids
  api_desired_count  = var.api_desired_count
  api_cpu            = var.api_cpu
  api_memory         = var.api_memory
  ecr_repository_url = aws_ecr_repository.api.repository_url
  database_url_arn   = module.database.database_url_secret_arn
  redis_url_arn      = module.database.redis_url_secret_arn
  s3_bucket_name     = module.storage.documents_bucket_name
  domain             = var.domain
  certificate_arn    = var.certificate_arn
}

module "cdn" {
  source = "./modules/cdn"

  name_prefix     = local.name_prefix
  environment     = var.environment
  domain          = var.domain
  certificate_arn = var.certificate_arn
  s3_bucket_arn   = module.storage.static_assets_bucket_arn
  s3_bucket_domain = module.storage.static_assets_bucket_domain
}

module "monitoring" {
  source = "./modules/monitoring"

  name_prefix      = local.name_prefix
  environment      = var.environment
  ecs_cluster_name = module.compute.ecs_cluster_name
  ecs_service_name = module.compute.ecs_service_name
  rds_instance_id  = module.database.rds_instance_id
  redis_cluster_id = module.database.redis_cluster_id
  alb_arn_suffix   = module.compute.alb_arn_suffix
  alarm_email      = var.alarm_email
}

# ── ECR Repository ────────────────────────────────────────────
resource "aws_ecr_repository" "api" {
  name                 = "${local.name_prefix}-api"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = var.environment != "production"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["production"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}
