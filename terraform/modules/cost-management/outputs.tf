# Cost Management Module Outputs

output "budget_arn" {
  description = "Budget ARN"
  value       = try(aws_budgets_budget.main[0].arn, "")
}

output "budget_name" {
  description = "Budget name"
  value       = try(aws_budgets_budget.main[0].name, "")
}

output "estimated_monthly_cost" {
  description = "Estimated monthly cost"
  value       = var.monthly_budget_limit
}
