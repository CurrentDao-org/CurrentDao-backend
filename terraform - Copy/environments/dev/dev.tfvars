# =============================================================================
# Development Environment Configuration
# =============================================================================

# Environment
environment = "dev"

# AWS Region
aws_region = "us-east-1"

# Default Tags
default_tags = {
  Project     = "CurrentDao"
  ManagedBy   = "Terraform"
  Environment = "dev"
  CostCenter  = "Engineering"
  Team        = "Platform"
}

# =============================================================================
# VPC Configuration
# =============================================================================
vpc_cidr              = "10.0.0.0/16"
availability_zones    = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs   = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs  = ["10.0.11.0/24", "10.0.12.0/24"]
database_subnet_cidrs = ["10.0.21.0/24", "10.0.22.0/24"]

# =============================================================================
# EC2 Configuration
# =============================================================================
instance_type          = "t3.small"
instance_count         = 1
instance_volume_size   = 20
instance_volume_type   = "gp3"
enable_monitoring      = true

# Auto Scaling
asg_min_size         = 1
asg_max_size         = 2
asg_desired_capacity = 1

# =============================================================================
# Database Configuration
# =============================================================================
database_engine          = "postgres"
database_engine_version  = "15.3"
database_instance_class  = "db.t3.small"
database_allocated_storage = 20
database_max_allocated_storage = 50
database_name            = "currentdao_dev"
database_multi_az        = false
database_backup_retention_days = 1
database_skip_final_snapshot = true

# =============================================================================
# Cache Configuration
# =============================================================================
cache_engine       = "redis"
cache_node_type    = "cache.t3.micro"
cache_num_cache_nodes = 1

# =============================================================================
# Security Configuration
# =============================================================================
allowed_cidr_blocks       = ["10.0.0.0/16"]
allowed_ssh_cidr_blocks   = ["10.0.0.0/16"]
enable_deletion_protection = false

# =============================================================================
# Monitoring Configuration
# =============================================================================
enable_cloudwatch_logs = true
log_retention_days     = 7
enable_alarms          = true
notification_email     = ""

# =============================================================================
# Cost Optimization
# =============================================================================
enable_spot_instances = false
enable_cost_alerts    = true
monthly_budget_limit  = 200

# =============================================================================
# Backup Configuration
# =============================================================================
enable_backup         = false
backup_retention_days = 7
