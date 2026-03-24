# ============================================================================
# Database Module
# ============================================================================
# Creates RDS PostgreSQL/MySQL database with encryption and backups

resource "aws_db_instance" "main" {
  identifier     = "rds-${var.environment}"

  # Engine Configuration
  engine         = var.engine
  engine_version = var.engine_version
  instance_class = var.instance_class

  # Storage Configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  storage_encrypted     = var.storage_encrypted

  # Network Configuration
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = var.security_group_ids

  # Database Configuration
  db_name  = var.database_name
  username = var.db_username
  password = var.db_password

  # Multi-AZ (only in prod)
  multi_az = var.multi_az

  # Backup Configuration
  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  # Deletion Protection
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.skip_final_snapshot

  # Performance Insights
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_retention_period = 7

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Parameter Group
  parameter_group_name = var.parameter_group_name

  # Option Group
  option_group_name = var.option_group_name

  # License Model
  license_model = var.engine == "postgres" ? "postgresql-license" : "general-public-license"

  tags = merge(var.tags, {
    Name = "rds-${var.environment}"
  })
}

# =============================================================================
# Database Parameter Group (PostgreSQL)
# =============================================================================
resource "aws_db_parameter_group" "postgres" {
  count = var.engine == "postgres" ? 1 : 0

  name   = "pg-${var.environment}"
  family = "postgres15"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = merge(var.tags, {
    Name = "pg-param-${var.environment}"
  })
}

# =============================================================================
# Database Parameter Group (MySQL)
# =============================================================================
resource "aws_db_parameter_group" "mysql" {
  count = var.engine == "mysql" ? 1 : 0

  name   = "mysql-${var.environment}"
  family = "mysql8.0"

  parameter {
    name  = "require_secure_transport"
    value = "ON"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  tags = merge(var.tags, {
    Name = "mysql-param-${var.environment}"
  })
}

# =============================================================================
# Option Group
# =============================================================================
resource "aws_db_option_group" "main" {
  name                     = "option-${var.environment}"
  option_group_description = "Option group for ${var.engine}"
  engine_name              = var.engine
  major_engine_version     = var.engine_version

  option {
    option_name = "LOG_EXPORTS"
    option_settings {
      name  = "enable_log_exports"
      value = "1"
    }
  }

  tags = merge(var.tags, {
    Name = "option-${var.environment}"
  })
}

# =============================================================================
# CloudWatch Alarms
# =============================================================================

# CPU Alarm
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "rds-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization high"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
}

# Storage Alarm
resource "aws_cloudwatch_metric_alarm" "storage" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "rds-storage-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240 # 10GB
  alarm_description   = "RDS storage space low"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
}

# Connections Alarm
resource "aws_cloudwatch_metric_alarm" "connections" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "rds-connections-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "High number of database connections"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
}

# =============================================================================
# Locals for optional values
# =============================================================================
locals {
  db_subnet_group_name = var.db_subnet_group_name != "" ? var.db_subnet_group_name : ""
  parameter_group_name = var.parameter_group_name != "" ? var.parameter_group_name : (
    var.engine == "postgres" ? aws_db_parameter_group.postgres[0].name : aws_db_parameter_group.mysql[0].name
  )
}
