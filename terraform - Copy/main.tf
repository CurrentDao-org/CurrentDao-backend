# ============================================================================
# CurrentDao Infrastructure - Main Terraform Configuration
# ============================================================================
# This is the main entry point for provisioning all infrastructure resources

# =============================================================================
# Module: VPC (Networking)
# =============================================================================
module "vpc" {
  source = "./modules/networking/vpc"

  environment = var.environment
  vpc_cidr    = var.vpc_cidr

  availability_zones     = var.availability_zones
  public_subnet_cidrs    = var.public_subnet_cidrs
  private_subnet_cidrs   = var.private_subnet_cidrs
  database_subnet_cidrs  = var.database_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment == "prod" ? false : true
  enable_dns_hostnames   = true
  enable_dns_support     = true

  tags = merge(var.default_tags, {
    Module = "Networking"
  })
}

# =============================================================================
# Module: Security Groups
# =============================================================================
module "security" {
  source = "./modules/security/security-groups"

  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  allowed_cidr_blocks = var.allowed_cidr_blocks
  allowed_ssh_cidr_blocks = var.allowed_ssh_cidr_blocks

  tags = merge(var.default_tags, {
    Module = "Security"
  })
}

# =============================================================================
# Module: KMS (Encryption)
# =============================================================================
module "security_kms" {
  source = "./modules/security/kms"

  environment = var.environment
  key_alias   = "currentdao-${var.environment}"

  enable_key_rotation = true
  deletion_window_days = 7

  tags = merge(var.default_tags, {
    Module = "Security-KMS"
  })
}

# =============================================================================
# Module: Secrets Manager
# =============================================================================
module "secrets" {
  source = "./modules/security/secrets-manager"

  environment        = var.environment
  kms_key_arn        = module.security_kms.kms_key_arn
  database_name      = var.database_name
  database_username  = var.database_username
  database_password  = var.database_password
  database_engine    = var.database_engine

  tags = merge(var.default_tags, {
    Module = "Security-Secrets"
  })
}

# =============================================================================
# Module: Compute (EC2 & Auto Scaling)
# =============================================================================
module "compute" {
  source = "./modules/compute"

  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.private_subnet_ids
  security_group_ids     = [module.security.app_security_group_id]
  instance_type          = var.instance_type
  instance_count         = var.instance_count
  instance_volume_size   = var.instance_volume_size
  instance_volume_type   = var.instance_volume_type
  enable_monitoring      = var.enable_monitoring
  user_data              = var.user_data

  # Auto Scaling Group Configuration
  min_size     = var.asg_min_size
  max_size     = var.asg_max_size
  desired_capacity = var.asg_desired_capacity

  # IAM
  enable_ssm_access = true

  # Cost Optimization
  enable_spot_instances = var.enable_spot_instances

  # Tags
  tags = merge(var.default_tags, {
    Module = "Compute"
  })
}

# =============================================================================
# Module: Database (RDS)
# =============================================================================
module "database" {
  source = "./modules/database"

  environment              = var.environment
  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.database_subnet_ids
  security_group_ids       = [module.security.database_security_group_id]
  database_name            = var.database_name

  engine                   = var.database_engine
  engine_version           = var.database_engine_version
  instance_class          = var.database_instance_class

  allocated_storage        = var.database_allocated_storage
  max_allocated_storage    = var.database_max_allocated_storage
  multi_az                 = var.environment == "prod" ? var.database_multi_az : false
  backup_retention_days    = var.database_backup_retention_days
  skip_final_snapshot      = var.database_skip_final_snapshot
  deletion_protection      = var.enable_deletion_protection

  # KMS
  kms_key_arn              = module.security_kms.kms_key_arn

  # Secrets
  db_username              = var.database_username
  db_password              = var.database_password

  # Performance
  storage_encrypted        = true
  performance_insights_enabled = true

  tags = merge(var.default_tags, {
    Module = "Database"
  })
}

# =============================================================================
# Module: Cache (ElastiCache Redis)
# =============================================================================
module "cache" {
  source = "./modules/cache"

  environment                  = var.environment
  vpc_id                       = module.vpc.vpc_id
  subnet_ids                   = module.vpc.private_subnet_ids
  security_group_ids           = [module.security.redis_security_group_id]

  engine                       = var.cache_engine
  node_type                    = var.cache_node_type
  num_cache_nodes              = var.environment == "prod" ? var.cache_num_cache_nodes : 1
  port                         = var.cache_port

  # Encryption
  at_rest_encryption_enabled   = var.cache_at_rest_encryption_enabled
  transit_encryption_enabled   = var.cache_transit_encryption_enabled
  kms_key_arn                  = module.security_kms.kms_key_arn

  # Backup
  snapshot_retention_limit     = var.environment == "prod" ? 7 : 1

  tags = merge(var.default_tags, {
    Module = "Cache"
  })
}

# =============================================================================
# Module: Storage (S3)
# =============================================================================
module "storage" {
  source = "./modules/storage"

  environment = var.environment
  s3_buckets  = var.s3_buckets

  # KMS
  kms_key_arn = module.security_kms.kms_key_arn

  tags = merge(var.default_tags, {
    Module = "Storage"
  })
}

# =============================================================================
# Module: Load Balancer (ALB)
# =============================================================================
module "alb" {
  source = "./modules/networking/alb"

  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.public_subnet_ids
  security_group_ids   = [module.security.alb_security_group_id]

  # Target Group
  target_instance_ids = module.compute.instance_ids
  health_check_path   = "/health"

  # HTTPS
  enable_https         = var.certificate_arn != "" ? true : false
  certificate_arn     = var.certificate_arn
  ssl_policy          = "ELBSecurityPolicy-2016-08"

  # Deletion Protection
  enable_deletion_protection = var.enable_deletion_protection_lb

  tags = merge(var.default_tags, {
    Module = "ALB"
  })
}

# =============================================================================
# Module: DNS (Route53)
# =============================================================================
module "dns" {
  source = "./modules/networking/dns"

  environment   = var.environment
  domain_name    = var.domain_name
  enable_dns     = var.enable_dns
  alb_dns_name   = module.alb.alb_dns_name
  alb_zone_id    = module.alb.alb_zone_id

  tags = merge(var.default_tags, {
    Module = "DNS"
  })
}

# =============================================================================
# Module: Monitoring (CloudWatch)
# =============================================================================
module "monitoring" {
  source = "./modules/monitoring"

  environment              = var.environment
  vpc_id                   = module.vpc.vpc_id

  # Log Group
  enable_cloudwatch_logs  = var.enable_cloudwatch_logs
  log_retention_days      = var.log_retention_days

  # Alarms
  enable_alarms           = var.enable_alarms
  notification_email      = var.notification_email

  # ASG
  asg_name                = module.compute.asg_name

  # RDS
  database_endpoint       = module.database.db_instance_endpoint
  database_instance_id    = module.database.db_instance_id

  # Redis
  redis_endpoint          = module.cache.redis_endpoint

  # ALB
  alb_arn                 = module.alb.alb_arn

  # Tags
  tags = merge(var.default_tags, {
    Module = "Monitoring"
  })
}

# =============================================================================
# Module: Cost Management
# =============================================================================
module "cost_management" {
  source = "./modules/cost-management"

  environment           = var.environment

  # Budget
  enable_budget         = var.enable_cost_alerts
  monthly_budget_limit = var.monthly_budget_limit

  # Tags for cost allocation
  cost_allocation_tags = var.cost_allocation_tags

  tags = merge(var.default_tags, {
    Module = "CostManagement"
  })
}

# =============================================================================
# Module: Backup
# =============================================================================
module "backup" {
  source = "./modules/backup"

  environment             = var.environment

  enable_backup          = var.enable_backup
  schedule                = var.backup_schedule
  retention_days          = var.backup_retention_days

  # Resources to backup
  rds_instance_arn       = module.database.db_instance_arn
  s3_bucket_arns         = [for bucket in values(module.storage.s3_bucket_arns) : bucket]

  tags = merge(var.default_tags, {
    Module = "Backup"
  })
}
