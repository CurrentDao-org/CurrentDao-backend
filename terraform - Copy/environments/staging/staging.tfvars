# =============================================================================
# Staging Environment Configuration
# =============================================================================

# Environment
environment = "staging"

# AWS Region
aws_region = "us-east-1"

# Default Tags
default_tags = {
  Project     = "CurrentDao"
  ManagedBy   = "Terraform"
  Environment = "staging"
  CostCenter  = "Engineering"
  Team        = "Platform"
}

# =============================================================================
# VPC Configuration
# =============================================================================
vpc_cidr              = "10.1.0.0/16"
availability_zones    = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs   = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnet_cidrs  = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]
database_subnet_cidrs = ["10.1.21.0/24", "10.1.22.0/24", "10.1.23.0/24"]

# =============================================================================
# EC2 Configuration
# =============================================================================
instance_type          = "t3.medium"
instance_count         = 2
instance_volume_size   = 30
instance_volume_type   = "gp3"
enable_monitoring      = true

# Auto Scaling
asg_min_size         = 1
asg_max_size         = 3
asg_desired_capacity = 2

# =============================================================================
# Database Configuration
# =============================================================================
database_engine          = "postgres"
database_engine_version  = "15.3"
database_instance_class  = "db.t3.medium"
database_allocated_storage = 50
database_max_allocated_storage = 200
database_name            = "currentdao_staging"
database_multi_az        = false
database_backup_retention_days = 7
database_skip_final_snapshot = true

# =============================================================================
# Cache Configuration
# =============================================================================
cache_engine       = "redis"
cache_node_type    = "cache.t3.small"
cache_num_cache_nodes = 2

# =============================================================================
# Security Configuration
# =============================================================================
allowed_cidr_blocks       = ["10.1.0.0/16"]
allowed_ssh_cidr_blocks   = ["10.1.0.0/16"]
enable_deletion_protection = false

# =============================================================================
# Monitoring Configuration
# =============================================================================
enable_cloudwatch_logs = true
log_retention_days     = 14
enable_alarms          = true
notification_email     = ""

# =============================================================================
# Cost Optimization
# =============================================================================
enable_spot_instances = false
enable_cost_alerts    = true
monthly_budget_limit  = 500

# =============================================================================
# Backup Configuration
# =============================================================================
enable_backup         = true
backup_retention_days = 14
