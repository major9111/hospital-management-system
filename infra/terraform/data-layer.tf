# Multi-AZ Postgres: a synchronous standby in the second AZ takes over
# automatically on primary failure (RDS handles the failover, typically
# 60-120s). Read replicas can be added per-region later if a hospital
# network expands geographically and latency to the primary region matters.

resource "aws_db_subnet_group" "main" {
  name       = "hospital-db-subnet-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "postgres" {
  identifier             = "hospital-db-${var.environment}"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.db_instance_class
  allocated_storage      = 100
  storage_type           = "gp3"
  multi_az               = true # HA — automatic failover to standby AZ
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  storage_encrypted       = true # patient data at rest — non-negotiable
  backup_retention_period = 30
  deletion_protection     = true

  # Row-level security policies live in db/schema.sql and apply regardless
  # of which AZ is currently primary.
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "hospital-redis-subnet-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "hospital-redis-${var.environment}"
  description           = "Session cache, rate limiting, pub/sub for notifications"
  engine                = "redis"
  engine_version        = "7.1"
  node_type              = "cache.r6g.large"
  num_cache_clusters     = 2 # primary + replica across AZs
  automatic_failover_enabled = true
  subnet_group_name      = aws_elasticache_subnet_group.main.name
  security_group_ids     = [aws_security_group.internal_services.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
