# Backup Module Outputs

output "backup_plan_id" {
  description = "Backup plan ID"
  value       = try(aws_backup_plan.main[0].id, "")
}

output "backup_vault_name" {
  description = "Backup vault name"
  value       = try(aws_backup_vault.main[0].name, "")
}

output "backup_vault_arn" {
  description = "Backup vault ARN"
  value       = try(aws_backup_vault.main[0].arn, "")
}
