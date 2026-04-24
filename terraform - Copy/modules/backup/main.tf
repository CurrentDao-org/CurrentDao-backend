# ============================================================================
# Backup Module (AWS Backup)
# ============================================================================
# Creates AWS Backup plan for automatic backups

# =============================================================================
# Backup Plan
# =============================================================================
resource "aws_backup_plan" "main" {
  count = var.enable_backup ? 1 : 0

  name = "backup-plan-${var.environment}"

  rule {
    name             = "daily-backup"
    schedule         = var.schedule
    target_vault_name = aws_backup_vault.main[0].name
    start_window     = 60
    completion_window = 180

    lifecycle {
      cold_storage_after_days = 30
      delete_after_days       = var.retention_days
    }
  }

  tags = var.tags
}

# =============================================================================
# Backup Vault
# =============================================================================
resource "aws_backup_vault" "main" {
  count = var.enable_backup ? 1 : 0

  name        = "backup-vault-${var.environment}"
  kms_key_arn = var.kms_key_arn

  tags = var.tags
}

# =============================================================================
# Backup Selection - RDS
# =============================================================================
resource "aws_backup_selection" "rds" {
  count = var.enable_backup && var.rds_instance_arn != "" ? 1 : 0

  name         = "backup-selection-rds-${var.environment}"
  plan_id      = aws_backup_plan.main[0].id
  resource_arn = var.rds_instance_arn
}

# =============================================================================
# Backup Selection - S3
# =============================================================================
resource "aws_backup_selection" "s3" {
  count = var.enable_backup && length(var.s3_bucket_arns) > 0 ? 1 : 0

  name     = "backup-selection-s3-${var.environment}"
  plan_id  = aws_backup_plan.main[0].id
  resources = var.s3_bucket_arns
}
