# ============================================================================
# Storage Module (S3 Buckets)
# ============================================================================
# Creates S3 buckets with encryption, versioning, and lifecycle rules

locals {
  bucket_name_prefix = "currentdao-${var.environment}"
}

# =============================================================================
# S3 Buckets
# =============================================================================
resource "aws_s3_bucket" "main" {
  for_each = var.s3_buckets

  bucket = "${local.bucket_name_prefix}-${each.key}"

  tags = merge(var.tags, {
    Name = "${local.bucket_name_prefix}-${each.key}"
  })
}

# =============================================================================
# S3 Bucket ACL
# =============================================================================
resource "aws_s3_bucket_acl" "main" {
  for_each = var.s3_buckets

  bucket = aws_s3_bucket.main[each.key].id
  acl    = each.value.acl
}

# =============================================================================
# S3 Bucket Versioning
# =============================================================================
resource "aws_s3_bucket_versioning" "main" {
  for_each = var.s3_buckets

  bucket = aws_s3_bucket.main[each.key].id

  versioning_configuration {
    status = each.value.versioning ? "Enabled" : "Disabled"
  }
}

# =============================================================================
# S3 Bucket Server Side Encryption
# =============================================================================
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  for_each = var.s3_buckets

  bucket = aws_s3_bucket.main[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "AES256"
      kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : null
    }
  }
}

# =============================================================================
# S3 Bucket Lifecycle Rules
# =============================================================================
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  for_each = { for k, v in var.s3_buckets : k => v if length(v.lifecycle_rule) > 0 }

  bucket = aws_s3_bucket.main[each.key].id

  rule {
    id     = each.value.lifecycle_rule[0].id
    status = each.value.lifecycle_rule[0].enabled ? "Enabled" : "Disabled"

    expiration {
      days = each.value.lifecycle_rule[0].expiration_days
    }

    transition {
      days          = each.value.lifecycle_rule[0].transition_days
      storage_class = each.value.lifecycle_rule[0].storage_class
    }
  }
}

# =============================================================================
# S3 Bucket Public Access Block
# =============================================================================
resource "aws_s3_bucket_public_access_block" "main" {
  for_each = var.s3_buckets

  bucket = aws_s3_bucket.main[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =============================================================================
# S3 Bucket Policy - Deny Unencrypted Uploads
# =============================================================================
resource "aws_s3_bucket_policy" "deny_unencrypted" {
  for_each = var.s3_buckets

  bucket = aws_s3_bucket.main[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnencryptedObjectUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource = [
          "${aws_s3_bucket.main[each.key].arn}/*"
        ]
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" : "AES256"
          }
        }
      }
    ]
  })
}

# =============================================================================
# S3 Bucket Tags - Cost Allocation
# =============================================================================
resource "aws_s3_bucket_tagging" "main" {
  for_each = var.s3_buckets

  bucket = aws_s3_bucket.main[each.key].id

  tag_set = [
    for key, value in var.cost_allocation_tags : {
      key   = key
      value = value
    }
  ]
}
