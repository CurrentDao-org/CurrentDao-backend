# Database Module Outputs

output "db_instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "db_instance_read_endpoint" {
  description = "RDS instance read endpoint"
  value       = aws_db_instance.main.address
  sensitive   = true
}

output "db_instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "db_instance_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "db_instance_port" {
  description = "Database port"
  value       = aws_db_instance.main.port
}

output "db_parameter_group_name" {
  description = "Database parameter group name"
  value       = local.parameter_group_name
}

output "option_group_name" {
  description = "Option group name"
  value       = aws_db_option_group.main.name
}
