# ============================================================================
# Terraform Variables
# ============================================================================
# This file defines all input variables for the Terraform configuration

# =============================================================================
# AWS Configuration
# =============================================================================

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# =============================================================================
# Default Tags
# =============================================================================

variable "default_tags" {
  description = "Default tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "CurrentDao"
    ManagedBy   = "Terraform"
    Environment = "dev"
    CostCenter  = "Engineering"
  }
}

# =============================================================================
# VPC Configuration
# =============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# =============================================================================
# EC2 Configuration
# =============================================================================

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "instance_count" {
  description = "Number of EC2 instances"
  type        = number
  default     = 2
}

variable "instance_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 30
}

variable "instance_volume_type" {
  description = "Root volume type (gp2, gp3, io1, io2)"
  type        = string
  default     = "gp3"
}

variable "enable_monitoring" {
  description = "Enable CloudWatch detailed monitoring"
  type        = bool
  default     = true
}

variable "user_data" {
  description = "User data script for EC2 instances"
  type        = string
  default     = ""
}

# =============================================================================
# RDS Configuration
# =============================================================================

variable "database_engine" {
  description = "Database engine (postgres, mysql, aurora-postgresql, aurora-mysql)"
  type        = string
  default     = "postgres"
}

variable "database_engine_version" {
  description = "Database engine version"
  type        = string
  default     = "15.3"
}

variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "database_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

variable "database_max_allocated_storage" {
  description = "Maximum allocated storage in GB for autoscaling"
  type        = number
  default     = 500
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "currentdao"
}

variable "database_username" {
  description = "Database master username"
  type        = string
  default     = "dbadmin"
  sensitive   = true
}

variable "database_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "database_backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7
}

variable "database_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "database_skip_final_snapshot" {
  description = "Skip final snapshot on database deletion"
  type        = bool
  default     = true
}

# =============================================================================
# ElastiCache Configuration
# =============================================================================

variable "cache_engine" {
  description = "Cache engine (redis, memcached)"
  type        = string
  default     = "redis"
}

variable "cache_node_type" {
  description = "Cache node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "cache_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2
}

variable "cache_port" {
  description = "Cache port"
  type        = number
  default     = 6379
}

variable "cache_at_rest_encryption_enabled" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "cache_transit_encryption_enabled" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

# =============================================================================
# S3 Configuration
# =============================================================================

variable "s3_buckets" {
  description = "Map of S3 bucket configurations"
  type = map(object({
    acl           = string
    versioning    = bool
    lifecycle_rule = list(object({
      enabled = bool
      id      = string
      expiration_days = number
      transition_days = number
      storage_class = string
    }))
  }))
  default = {
    "assets" = {
      acl           = "private"
      versioning    = true
      lifecycle_rule = [{
        enabled       = true
        id            = "archive-old-objects"
        expiration_days = 365
        transition_days = 30
        storage_class = "GLACIER"
      }]
    }
  }
}

# =============================================================================
# Security Configuration
# =============================================================================

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access resources"
  type        = list(string)
  default     = ["10.0.0.0/8"]
}

variable "allowed_ssh_cidr_blocks" {
  description = "CIDR blocks allowed to access SSH"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = true
}

variable "enable_waf" {
  description = "Enable AWS WAF for security"
  type        = bool
  default     = false
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty for threat detection"
  type        = bool
  default     = false
}

variable "enable_security_hub" {
  description = "Enable AWS Security Hub"
  type        = bool
  default     = false
}

# =============================================================================
# Load Balancer Configuration
# =============================================================================

variable "enable_dns" {
  description = "Enable Route53 DNS"
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
  default     = ""
}

variable "enable_deletion_protection_lb" {
  description = "Enable deletion protection for Load Balancer"
  type        = bool
  default     = true
}

# =============================================================================
# Auto Scaling Configuration
# =============================================================================

variable "asg_min_size" {
  description = "Minimum number of instances in ASG"
  type        = number
  default     = 1
}

variable "asg_max_size" {
  description = "Maximum number of instances in ASG"
  type        = number
  default     = 4
}

variable "asg_desired_capacity" {
  description = "Desired number of instances in ASG"
  type        = number
  default     = 2
}

variable "asg_scale_up_threshold" {
  description = "CPU utilization threshold for scale up"
  type        = number
  default     = 70
}

variable "asg_scale_down_threshold" {
  description = "CPU utilization threshold for scale down"
  type        = number
  default     = 30
}

# =============================================================================
# Monitoring & Logging
# =============================================================================

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch Logs"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
  default     = 30
}

variable "enable_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "notification_email" {
  description = "Email address for notifications"
  type        = string
  default     = ""
}

# =============================================================================
# Cost Optimization
# =============================================================================

variable "enable_spot_instances" {
  description = "Use Spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "reserved_instance_term" {
  description = "Reserved Instance term (1year, 3year)"
  type        = string
  default     = "1year"
}

variable "reserved_instance_offering_class" {
  description = "Reserved Instance offering class (standard, convertible)"
  type        = string
  default     = "standard"
}

variable "enable_cost_alerts" {
  description = "Enable cost budget alerts"
  type        = bool
  default     = true
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 1000
}

# =============================================================================
# Tags for Cost Allocation
# =============================================================================

variable "cost_allocation_tags" {
  description = "Tags for cost allocation"
  type        = map(string)
  default = {
    Environment = "dev"
    Team        = "Platform"
    Project     = "CurrentDao"
  }
}

# =============================================================================
# Backup Configuration
# =============================================================================

variable "enable_backup" {
  description = "Enable AWS Backup for resource protection"
  type        = bool
  default     = false
}

variable "backup_schedule" {
  description = "Backup schedule in cron format"
  type        = string
  default     = "cron(0 5 ? * * *)"
}

variable "backup_retention_days" {
  description = "Backup retention in days"
  type        = number
  default     = 30
}
