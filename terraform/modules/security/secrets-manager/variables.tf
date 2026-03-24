# Secrets Manager Module Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN"
  type        = string
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "currentdao"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "dbadmin"
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "database_engine" {
  description = "Database engine"
  type        = string
  default     = "postgres"
}

variable "database_host" {
  description = "Database host"
  type        = string
  default     = ""
}

variable "database_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
