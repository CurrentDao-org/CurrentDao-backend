# ============================================================================
# KMS Module
# ============================================================================
# Creates KMS key for encryption

resource "aws_kms_key" "main" {
  description             = "KMS key for ${var.environment}"
  deletion_window_in_days = var.deletion_window_days
  enable_key_rotation    = var.enable_key_rotation

  tags = merge(var.tags, {
    Name = "kms-${var.environment}"
  })
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.key_alias}"
  target_key_id = aws_kms_key.main.key_id
}
