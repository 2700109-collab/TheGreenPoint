###############################################################################
# Database Module – RDS PostgreSQL 16 + ElastiCache Redis 7
###############################################################################

locals {
  is_prod = var.environment == "prod" || var.environment == "production"
}

# ─── RDS PostgreSQL ──────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.name_prefix}-db-subnet"
    Environment = var.environment
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg"
  description = "Allow PostgreSQL access from approved security groups"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.name_prefix}-rds-sg"
    Environment = var.environment
  }
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.name_prefix}-pg16-params"
  family = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Name        = "${var.name_prefix}-pg16-params"
    Environment = var.environment
  }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_instance" "this" {
  identifier = "${var.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = "16"

  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.this.name

  storage_encrypted = true
  kms_key_id        = null # uses default aws/rds key

  backup_retention_period = 35
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:30-sun:05:30"

  deletion_protection = local.is_prod
  skip_final_snapshot = !local.is_prod
  final_snapshot_identifier = local.is_prod ? "${var.name_prefix}-final-snapshot" : null

  performance_insights_enabled = true

  apply_immediately = false

  tags = {
    Name        = "${var.name_prefix}-postgres"
    Environment = var.environment
  }
}

# ─── RDS Secrets Manager ────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "database_url" {
  name        = "${var.name_prefix}/database-url"
  description = "PostgreSQL connection string for ${var.name_prefix}"

  tags = {
    Name        = "${var.name_prefix}-database-url"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = join("", [
    "postgresql://",
    var.db_username,
    ":",
    random_password.db.result,
    "@",
    aws_db_instance.this.endpoint,
    "/",
    var.db_name,
    "?sslmode=require",
  ])
}

# ─── ElastiCache Redis ──────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name_prefix}-redis-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.name_prefix}-redis-subnet"
    Environment = var.environment
  }
}

resource "aws_security_group" "redis" {
  name        = "${var.name_prefix}-redis-sg"
  description = "Allow Redis access from approved security groups"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.name_prefix}-redis-sg"
    Environment = var.environment
  }
}

resource "random_password" "redis" {
  length  = 32
  special = false
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "Redis cluster for ${var.name_prefix}"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  num_cache_clusters   = 2 # primary + 1 replica

  automatic_failover_enabled = true

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis.result

  snapshot_retention_limit = 7
  snapshot_window          = "02:00-03:00"
  maintenance_window       = "sun:04:00-sun:05:00"

  tags = {
    Name        = "${var.name_prefix}-redis"
    Environment = var.environment
  }
}

# ─── Redis Secrets Manager ──────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "redis_url" {
  name        = "${var.name_prefix}/redis-url"
  description = "Redis connection string for ${var.name_prefix}"

  tags = {
    Name        = "${var.name_prefix}-redis-url"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id = aws_secretsmanager_secret.redis_url.id
  secret_string = join("", [
    "rediss://:",
    random_password.redis.result,
    "@",
    aws_elasticache_replication_group.this.primary_endpoint_address,
    ":6379",
  ])
}
