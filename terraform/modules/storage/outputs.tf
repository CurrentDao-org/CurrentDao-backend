# Storage Module Outputs

output "s3_bucket_arns" {
  description = "Map of S3 bucket ARNs"
  value = {
    for bucket in aws_s3_bucket.main : bucket.id => bucket.arn
  }
}

output "s3_bucket_names" {
  description = "Map of S3 bucket names"
  value = {
    for bucket in aws_s3_bucket.main : bucket.id => bucket.id
  }
}

output "s3_bucket_ids" {
  description = "Map of S3 bucket IDs"
  value = {
    for bucket in aws_s3_bucket.main : bucket.id => bucket.id
  }
}
