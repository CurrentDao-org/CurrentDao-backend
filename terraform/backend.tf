# ============================================================================
# Terraform Backend Configuration
# ============================================================================
# This file configures remote state storage using S3

terraform {
  backend "s3" {
    bucket         = "currentdao-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
