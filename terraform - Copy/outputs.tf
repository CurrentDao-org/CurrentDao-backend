# ============================================================================
# Terraform Outputs
# ============================================================================
# This file defines all output values from the Terraform configuration

# =============================================================================
# VPC Outputs
# =============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "vpc_name" {
  description = "Name of the VPC"
  value       = module.vpc.vpc_name
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = module.vpc.database_subnet_ids
}

output "public_subnet_cidrs" {
  description = "CIDR blocks of the public subnets"
  value       = module.vpc.public_subnet_cidr_blocks
}

output "private_subnet_cidrs" {
  description = "CIDR blocks of the private subnets"
  value       = module.vpc.private_subnet_cidr_blocks
}

# =============================================================================
# Security Group Outputs
# =============================================================================

output "security_group_alb_id" {
  description = "ID of the ALB security group"
  value       = module.security.alb_security_group_id
}

output "security_group_app_id" {
  description = "ID of the application security group"
  value       = module.security.app_security_group_id
}

output "security_group_database_id" {
  description = "ID of the database security group"
  value       = module.security.database_security_group_id
}

output "security_group_redis_id" {
  description = "ID of the Redis security group"
  value       = module.security.redis_security_group_id
}

# =============================================================================
# EC2/ASG Outputs
# =============================================================================

output "launch_template_id" {
  description = "ID of the launch template"
  value       = module.compute.launch_template_id
}

output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = module.compute.asg_name
}

output "asg_arn" {
  description = "ARN of the Auto Scaling Group"
  value       = module.compute.asg_arn
}

output "instance_ids" {
  description = "IDs of the EC2 instances"
  value       = module.compute.instance_ids
}

output "instance_iam_role" {
  description = "IAM role name for EC2 instances"
  value       = module.compute.instance_iam_role_name
}

# =============================================================================
# RDS Outputs
# =============================================================================

output "database_endpoint" {
  description = "RDS cluster endpoint"
  value       = module.database.db_instance_endpoint
  sensitive   = true
}

output "database_read_endpoint" {
  description = "RDS cluster read endpoint"
  value       = module.database.db_instance_read_endpoint
  sensitive   = true
}

output "database_arn" {
  description = "RDS cluster ARN"
  value       = module.database.db_instance_arn
}

output "database_name" {
  description = "Database name"
  value       = module.database.db_instance_name
}

# =============================================================================
# ElastiCache Outputs
# =============================================================================

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.cache.redis_endpoint
}

output "redis_port" {
  description = "Redis port"
  value       = module.cache.redis_port
}

output "redis_arn" {
  description = "Redis cluster ARN"
  value       = module.cache.redis_arn
}

# =============================================================================
# S3 Outputs
# =============================================================================

output "s3_bucket_arns" {
  description = "Map of S3 bucket ARNs"
  value       = module.storage.s3_bucket_arns
}

output "s3_bucket_names" {
  description = "Map of S3 bucket names"
  value       = module.storage.s3_bucket_names
}

# =============================================================================
# Load Balancer Outputs
# =============================================================================

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = module.alb.alb_dns_name
}

output "alb_arn" {
  description = "ARN of the ALB"
  value       = module.alb.alb_arn
}

output "alb_zone_id" {
  description = "Route53 zone ID for the ALB"
  value       = module.alb.alb_zone_id
}

output "alb_target_group_arn" {
  description = "ARN of the ALB target group"
  value       = module.alb.alb_target_group_arn
}

# =============================================================================
# DNS Outputs
# =============================================================================

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = module.dns.route53_zone_id
}

output "route53_zone_name" {
  description = "Route53 hosted zone name"
  value       = module.dns.route53_zone_name
}

# =============================================================================
# Monitoring Outputs
# =============================================================================

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name"
  value       = module.monitoring.cloudwatch_log_group_name
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = module.monitoring.dashboard_url
}

# =============================================================================
# Cost Management Outputs
# =============================================================================

output "cost_budget_arn" {
  description = "Cost budget ARN"
  value       = module.cost_management.budget_arn
}

output "estimated_monthly_cost" {
  description = "Estimated monthly cost"
  value       = module.cost_management.estimated_monthly_cost
}

# =============================================================================
# Security Outputs
# =============================================================================

output "kms_key_arn" {
  description = "KMS key ARN for encryption"
  value       = module.security_kms.kms_key_arn
}

output "secrets_manager_secret_arn" {
  description = "Secrets Manager secret ARN"
  value       = module.secrets.secrets_manager_secret_arn
}

# =============================================================================
# Summary Outputs
# =============================================================================

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "all_tags" {
  description = "Map of all tags applied to resources"
  value       = var.default_tags
}

output "infrastructure_summary" {
  description = "Summary of infrastructure components"
  value = {
    vpc_id            = module.vpc.vpc_id
    availability_zones = var.availability_zones
    instance_type     = var.instance_type
    instance_count    = var.asg_desired_capacity
    database_engine   = var.database_engine
    cache_engine      = var.cache_engine
    load_balancer     = module.alb.alb_dns_name
    cost_budget       = var.monthly_budget_limit
  }
}
