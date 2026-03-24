# ============================================================================
# Cost Management Module
# ============================================================================
# Creates cost budgets and cost allocation tags

# =============================================================================
# Cost Budget
# =============================================================================
resource "aws_budgets_budget" "main" {
  count = var.enable_budget ? 1 : 0

  name        = "budget-${var.environment}"
  budget_type = "MONTHLY"
  limit_amount = format("%.2f", var.monthly_budget_limit)
  limit_unit  = "USD"
  time_unit   = "MONTHLY"

  cost_filters {
    tag_key   = "Environment"
    tag_value = [var.environment]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                   = 80
    threshold_type             = "PERCENTAGE"
    notification_type           = "FORECASTED"
    subscriber_email_addresses = [var.notification_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                   = 100
    threshold_type             = "PERCENTAGE"
    notification_type           = "ACTUAL"
    subscriber_email_addresses = [var.notification_email]
  }
}

# =============================================================================
# Cost Allocation Tags
# =============================================================================
resource "aws_cost_allocation_tag" "main" {
  count = length(var.cost_allocation_tags) > 0 ? 1 : 0

  tag_key   = "Environment"
  tag_values = [var.environment]
  status    = "Active"
}
