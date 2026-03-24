# Backup Module Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "enable_backup" {
  description = "Enable AWS Backup"
  type        = bool
  default     = false
}

variable "schedule" {
  description = "Backup schedule in cron format"
  type        = string
  default     = "cron(0 5 ? * * *)"
}

variable "retention_days" {
  description = "Retention in days"
  type        = number
  default     = 30
}

variable "rds_instance_arn" {
  description = "RDS instance ARN"
  type        = string
  default     = ""
}

variable "s3_bucket_arns" {
  description = "S3 bucket ARNs"
  type        = list(string)
  default     = []
}

variable "kms_key_arn" {
  description = "KMS key ARN for backup vault"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
