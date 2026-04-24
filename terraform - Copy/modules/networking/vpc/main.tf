# ============================================================================
# VPC Module
# ============================================================================
# Creates a VPC with public, private, and database subnets

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  tags = merge(var.tags, {
    Name = "vpc-${var.environment}"
  })
}

# =============================================================================
# Internet Gateway
# =============================================================================
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "igw-${var.environment}"
  })
}

# =============================================================================
# Public Subnets
# =============================================================================
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "public-subnet-${count.index + 1}-${var.environment}"
    Type = "Public"
  })
}

# =============================================================================
# Private Subnets
# =============================================================================
resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = "private-subnet-${count.index + 1}-${var.environment}"
    Type = "Private"
  })
}

# =============================================================================
# Database Subnets
# =============================================================================
resource "aws_subnet" "database" {
  count = length(var.database_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = "database-subnet-${count.index + 1}-${var.environment}"
    Type = "Database"
  })
}

# =============================================================================
# Database Subnet Group
# =============================================================================
resource "aws_db_subnet_group" "main" {
  name       = "db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.database[*].id

  tags = merge(var.tags, {
    Name = "db-subnet-group-${var.environment}"
  })
}

# =============================================================================
# ElastiCache Subnet Group
# =============================================================================
resource "aws_elasticache_subnet_group" "main" {
  name       = "cache-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.database[*].id

  tags = merge(var.tags, {
    Name = "cache-subnet-group-${var.environment}"
  })
}

# =============================================================================
# NAT Gateway (Elastic IP)
# =============================================================================
resource "aws_eip" "nat" {
  count = var.single_nat_gateway ? 1 : length(var.availability_zones)

  domain = "vpc"

  tags = merge(var.tags, {
    Name = "eip-nat-${count.index}-${var.environment}"
  })

  depends_on = [aws_internet_gateway.main]
}

# =============================================================================
# NAT Gateways
# =============================================================================
resource "aws_nat_gateway" "main" {
  count = var.single_nat_gateway ? 1 : length(var.availability_zones)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id      = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name = "nat-gateway-${count.index + 1}-${var.environment}"
  })

  depends_on = [aws_internet_gateway.main]
}

# =============================================================================
# Public Route Table
# =============================================================================
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(var.tags, {
    Name = "public-rt-${var.environment}"
  })
}

# =============================================================================
# Public Route Table Association
# =============================================================================
resource "aws_route_table_association" "public" {
  count = length(var.public_subnet_cidrs)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# =============================================================================
# Private Route Tables (one per AZ for HA)
# =============================================================================
resource "aws_route_table" "private" {
  count = var.single_nat_gateway ? 1 : length(var.availability_zones)

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = merge(var.tags, {
    Name = "private-rt-${count.index + 1}-${var.environment}"
  })
}

# =============================================================================
# Private Route Table Association
# =============================================================================
resource "aws_route_table_association" "private" {
  count = length(var.private_subnet_cidrs)

  # Use the appropriate route table based on AZ
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id
}

# =============================================================================
# VPC Endpoints (Private access to AWS services)
# =============================================================================

# S3 Gateway Endpoint
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.s3"

  tags = merge(var.tags, {
    Name = "vpce-s3-${var.environment}"
  })
}

# DynamoDB Gateway Endpoint
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.dynamodb"

  tags = merge(var.tags, {
    Name = "vpce-dynamodb-${var.environment}"
  })
}

# Secrets Manager Interface Endpoint
resource "aws_vpc_endpoint" "secrets_manager" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.secretsmanager"

  security_group_ids = [aws_vpc.main.id] # Will be replaced with proper SG

  tags = merge(var.tags, {
    Name = "vpce-secretsmanager-${var.environment}"
  })
}

# SSM Interface Endpoint
resource "aws_vpc_endpoint" "ssm" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.ssm"

  tags = merge(var.tags, {
    Name = "vpce-ssm-${var.environment}"
  })
}

# CloudWatch Logs Interface Endpoint
resource "aws_vpc_endpoint" "logs" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.logs"

  tags = merge(var.tags, {
    Name = "vpce-logs-${var.environment}"
  })
}

# =============================================================================
# VPC Flow Logs
# =============================================================================
resource "aws_flow_log" "main" {
  vpc_id         = aws_vpc.main.id
  traffic_type   = "ALL"
  log_destination_type = "CLOUDWATCH_LOGS"
  log_group_name = "/aws/vpc/flow-logs/${var.environment}"

  tags = merge(var.tags, {
    Name = "flow-logs-${var.environment}"
  })
}
