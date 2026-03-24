# Secrets Manager Module Outputs

output "secrets_manager_secret_id" {
  description = "Secrets Manager secret ID"
  value       = aws_secretsmanager_secret.main.id
}

output "secrets_manager_secret_arn" {
  description = "Secrets Manager secret ARN"
  value       = aws_secretsmanager_secret.main.arn
}

output "secrets_manager_secret_name" {
  description = "Secrets Manager secret name"
  value       = aws_secretsmanager_secret.main.name
}
