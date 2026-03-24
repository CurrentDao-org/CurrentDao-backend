# ============================================================================
# Security Groups Module
# ============================================================================
# Creates security groups for ALB, Application, Database, and Redis

# =============================================================================
# ALB Security Group
# =============================================================================
resource "aws_security_group" "alb" {
  name        = "sg-alb-${var.environment}"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  # Allow HTTP and HTTPS from anywhere
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  # Allow all outbound
  egress {
    description = "All traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "sg-alb-${var.environment}"
    Component = "ALB"
  })
}

# =============================================================================
# Application Security Group
# =============================================================================
resource "aws_security_group" "app" {
  name        = "sg-app-${var.environment}"
  description = "Security group for Application instances"
  vpc_id      = var.vpc_id

  # Allow traffic from ALB
  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow SSH from bastion/whitelist
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr_blocks
  }

  # Allow all outbound
  egress {
    description = "All traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "sg-app-${var.environment}"
    Component = "Application"
  })
}

# =============================================================================
# Database Security Group
# =============================================================================
resource "aws_security_group" "database" {
  name        = "sg-db-${var.environment}"
  description = "Security group for RDS database"
  vpc_id      = var.vpc_id

  # Allow PostgreSQL/MySQL from App SG
  ingress {
    description     = "PostgreSQL from App"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  ingress {
    description     = "MySQL from App"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  # Allow all outbound
  egress {
    description = "All traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "sg-db-${var.environment}"
    Component = "Database"
  })
}

# =============================================================================
# Redis Security Group
# =============================================================================
resource "aws_security_group" "redis" {
  name        = "sg-redis-${var.environment}"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  # Allow Redis from App SG
  ingress {
    description     = "Redis from App"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  # Allow all outbound
  egress {
    description = "All traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "sg-redis-${var.environment}"
    Component = "Cache"
  })
}

# =============================================================================
# Lambda Security Group (for future use)
# =============================================================================
resource "aws_security_group" "lambda" {
  name        = "sg-lambda-${var.environment}"
  description = "Security group for Lambda functions"
  vpc_id      = var.vpc_id

  # Allow all outbound
  egress {
    description = "All traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "sg-lambda-${var.environment}"
    Component = "Lambda"
  })
}

# =============================================================================
# EFS Security Group
# =============================================================================
resource "aws_security_group" "efs" {
  name        = "sg-efs-${var.environment}"
  description = "Security group for EFS file system"
  vpc_id      = var.vpc_id

  # Allow NFS from App SG
  ingress {
    description     = "NFS from App"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = merge(var.tags, {
    Name = "sg-efs-${var.environment}"
    Component = "Storage"
  })
}
