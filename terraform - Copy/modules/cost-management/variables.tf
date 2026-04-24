# Cost Management Module Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "enable_budget" {
  description = "Enable cost budget"
  type        = bool
  default     = true
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 1000
}

variable "notification_email" {
  description = "Email for budget notifications"
  type        = string
  default     = ""
}

variable "cost_allocation_tags" {
  description = "Tags for cost allocation"
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
