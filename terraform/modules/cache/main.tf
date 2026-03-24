# ============================================================================
# Cache Module (ElastiCache Redis)
# ============================================================================
# Creates ElastiCache Redis cluster with encryption

resource "aws_elasticache_subnet_group" "main" {
  name       = "cache-subnet-${var.environment}"
  subnet_ids = var.subnet_ids

  tags = var.tags
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "redis-${var.environment}"
  replication_group_description = "Redis cluster for ${var.environment}"

  engine               = var.engine
  engine_version       = var.engine_version
  node_type            = var.node_type

  num_cache_clusters    = var.num_cache_nodes
  num_node_groups       = var.num_cache_nodes > 1 ? 1 : 1
  replicas_per_node_group = var.num_cache_nodes > 1 ? var.num_cache_nodes - 1 : 0

  port                 = var.port
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = var.security_group_ids

  # Encryption
  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  transit_encryption_enabled = var.transit_encryption_enabled
  kms_key_id                 = var.kms_key_arn != "" ? var.kms_key_arn : null

  # Authentication
  auth_token_enabled = var.transit_encryption_enabled

  # Automatic Failover
  automatic_failover_enabled = var.num_cache_nodes > 1 ? true : false

  # Backup
  snapshot_retention_limit   = var.snapshot_retention_limit
  snapshot_window            = "03:00-05:00"
  maintenance_window          = "mon:05:00-mon:07:00"

  # Log Delivery
  log_delivery_configuration {
    destination      = aws_elasticache_cloudwatch_log_group.slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_elasticache_cloudwatch_log_group.engine.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  # Deletion Protection
  final_snapshot_identifier = var.enable_final_snapshot ? "redis-final-${var.environment}" : null

  tags = merge(var.tags, {
    Name = "redis-${var.environment}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# Parameter Group
# =============================================================================
resource "aws_elasticache_parameter_group" "main" {
  name   = "redis-${var.environment}"
  family = var.engine == "redis" ? "redis7" : "memcached1.6"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = var.tags
}

# =============================================================================
# CloudWatch Log Groups
# =============================================================================
resource "aws_elasticache_cloudwatch_log_group" "slow" {
  name              = "/aws/elasticache/redis/${var.environment}/slow-log"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_elasticache_cloudwatch_log_group" "engine" {
  name              = "/aws/elasticache/redis/${var.environment}/engine-log"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# =============================================================================
# CloudWatch Alarms
# =============================================================================
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "redis-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Redis CPU utilization high"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "memory" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "redis-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis memory usage high"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "evictions" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "redis-evictions-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "Redis evictions high"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }
}
