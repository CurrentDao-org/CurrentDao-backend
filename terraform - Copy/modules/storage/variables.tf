# Storage Module Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "s3_buckets" {
  description = "Map of S3 bucket configurations"
  type = map(object({
    acl           = string
    versioning    = bool
    lifecycle_rule = list(object({
      enabled       = bool
      id            = string
      expiration_days = number
      transition_days = number
      storage_class = string
    }))
  }))
  default = {}
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
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
