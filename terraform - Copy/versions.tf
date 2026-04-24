# Terraform Configuration
# This file defines the required Terraform version and provider versions

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    cloudinit = {
      source  = "hashicorp/cloudinit"
      version = "~> 2.3"
    }
  }

  # Enable remote state storage for collaboration
  backend "s3" {
    bucket = "currentdao-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

# Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.default_tags
  }

  # Enable STS regional endpoints for better security
  endpoints {
    ec2          = "https://ec2.${var.aws_region}.amazonaws.com"
    elb          = "https://elasticloadbalancing.${var.aws_region}.amazonaws.com"
    s3           = "https://s3.${var.aws_region}.amazonaws.com"
  }
}

# Provider for random ID generation
provider "random" {
  version = "~> 3.5"
}

# Provider for TLS certificates
provider "tls" {
  version = "~> 4.0"
}

# Provider for cloudinit
provider "cloudinit" {
  version = "~> 2.3"
}
