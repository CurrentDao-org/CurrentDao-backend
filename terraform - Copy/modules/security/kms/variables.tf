# KMS Module Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "key_alias" {
  description = "KMS key alias"
  type        = string
}

variable "enable_key_rotation" {
  description = "Enable key rotation"
  type        = bool
  default     = true
}

variable "deletion_window_days" {
  description = "Deletion window in days"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
