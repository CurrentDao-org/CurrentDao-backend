# =============================================================================
# Production Environment Configuration
# =============================================================================

# Environment
environment = "prod"

# AWS Region
aws_region = "us-east-1"

# Default Tags
default_tags = {
  Project     = "CurrentDao"
  ManagedBy   = "Terraform"
  Environment = "prod"
  CostCenter  = "Engineering"
  Team        = "Platform"
}

# =============================================================================
# VPC Configuration
# =============================================================================
vpc_cidr              = "10.2.0.0/16"
availability_zones    = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs   = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
private_subnet_cidrs  = ["10.2.11.0/24", "10.2.12.0/24", "10.2.13.0/24"]
database_subnet_cidrs = ["10.2.21.0/24", "10.2.22.0/24", "10.2.23.0/24"]

# =============================================================================
# EC2 Configuration
# =============================================================================
instance_type          = "t3.large"
instance_count         = 3
instance_volume_size   = 50
instance_volume_type   = "gp3"
enable_monitoring      = true

# Auto Scaling
asg_min_size         = 2
asg_max_size         = 6
asg_desired_capacity = 3
asg_scale_up_threshold = 70
asg_scale_down_threshold = 30

# =============================================================================
# Database Configuration
# =============================================================================
database_engine          = "postgres"
database_engine_version  = "15.3"
database_instance_class  = "db.r5.large"
database_allocated_storage = 100
database_max_allocated_storage = 500
database_name            = "currentdao_prod"
database_multi_az        = true
database_backup_retention_days = 30
database_skip_final_snapshot = false

# =============================================================================
# Cache Configuration
# =============================================================================
cache_engine       = "redis"
cache_node_type    = "cache.r5.large"
cache_num_cache_nodes = 3

# =============================================================================
# Security Configuration
# =============================================================================
allowed_cidr_blocks       = ["10.2.0.0/16"]
allowed_ssh_cidr_blocks   = ["10.2.0.0/16"]
enable_deletion_protection = true
enable_waf               = true
enable_guardduty        = true
enable_security_hub     = true

# =============================================================================
# DNS Configuration
# =============================================================================
enable_dns    = false
domain_name   = ""
certificate_arn = ""

# =============================================================================
# Monitoring Configuration
# =============================================================================
enable_cloudwatch_logs = true
log_retention_days     = 30
enable_alarms          = true
notification_email     = ""

# =============================================================================
# Cost Optimization
# =============================================================================
enable_spot_instances = false
enable_cost_alerts    = true
monthly_budget_limit  = 3000

# =============================================================================
# Backup Configuration
# =============================================================================
enable_backup         = true
backup_retention_days = 30
