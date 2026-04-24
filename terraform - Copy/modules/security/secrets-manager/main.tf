# ============================================================================
# Secrets Manager Module
# ============================================================================
# Creates Secrets Manager secrets for database credentials

resource "aws_secretsmanager_secret" "main" {
  name        = "secret-${var.environment}"
  description = "Secrets for ${var.environment} environment"
  kms_key_id  = var.kms_key_arn

  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = "secret-${var.environment}"
  })
}

resource "aws_secretsmanager_secret_version" "main" {
  secret_id = aws_secretsmanager_secret.main.id

  secret_string = jsonencode({
    username = var.database_username
    password = var.database_password
    engine   = var.database_engine
    host     = var.database_host
    port     = var.database_port
    dbname   = var.database_name
  })
}
