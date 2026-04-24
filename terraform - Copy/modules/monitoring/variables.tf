# Monitoring Module Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
  default     = ""
}

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch Logs"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Log retention in days"
  type        = number
  default     = 30
}

variable "enable_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "notification_email" {
  description = "Email for notifications"
  type        = string
  default     = ""
}

variable "asg_name" {
  description = "ASG name for monitoring"
  type        = string
  default     = ""
}

variable "database_endpoint" {
  description = "Database endpoint"
  type        = string
  default     = ""
}

variable "database_instance_id" {
  description = "Database instance ID"
  type        = string
  default     = ""
}

variable "redis_endpoint" {
  description = "Redis endpoint"
  type        = string
  default     = ""
}

variable "alb_arn" {
  description = "ALB ARN"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
