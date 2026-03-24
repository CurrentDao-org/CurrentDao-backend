# ============================================================================
# Compute Module
# ============================================================================
# Creates EC2 instances with Auto Scaling Group, Launch Template, and IAM

# =============================================================================
# IAM Role for EC2
# =============================================================================
resource "aws_iam_role" "ec2" {
  name = "role-ec2-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

# =============================================================================
# IAM Role Policy - CloudWatch Agent
# =============================================================================
resource "aws_iam_role_policy" "cloudwatch_agent" {
  name = "policy-cloudwatch-agent-${var.environment}"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "cloudwatch:PutMetricData",
        "ec2:DescribeTags"
      ]
      Resource = "*"
    }]
  })
}

# =============================================================================
# IAM Role Policy - SSM Access
# =============================================================================
resource "aws_iam_role_policy" "ssm_access" {
  name = "policy-ssm-access-${var.environment}"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ]
      Resource = "*"
    }]
  })
}

# =============================================================================
# IAM Role Policy - S3 Read Access
# =============================================================================
resource "aws_iam_role_policy" "s3_read" {
  name = "policy-s3-read-${var.environment}"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Resource = "*"
    }]
  })
}

# =============================================================================
# Instance Profile
# =============================================================================
resource "aws_iam_instance_profile" "ec2" {
  name = "profile-ec2-${var.environment}"
  role = aws_iam_role.ec2.name

  tags = var.tags
}

# =============================================================================
# Security Group for Compute (additional to the app SG)
# =============================================================================
resource "aws_security_group" "compute" {
  name        = "sg-compute-${var.environment}"
  description = "Security group for compute instances"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from VPC"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    description = "All traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "sg-compute-${var.environment}"
  })
}

# =============================================================================
# Launch Template
# =============================================================================
resource "aws_launch_template" "main" {
  name_prefix   = "lt-${var.environment}-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = var.instance_type

  key_name = var.key_name

  vpc_security_group_ids = concat([aws_security_group.compute.id], var.security_group_ids)

  user_data = base64encode(var.user_data != "" ? var.user_data : local.default_user_data)

  # Root Block Device
  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size = var.instance_volume_size
      volume_type = var.instance_volume_type
      encrypted   = true
      delete_on_termination = true
    }
  }

  # Metadata Options
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  # Monitoring
  monitoring {
    enabled = var.enable_monitoring
  }

  # Tag specifications
  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "instance-${var.environment}"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = var.tags
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

# =============================================================================
# Auto Scaling Group
# =============================================================================
resource "aws_autoscaling_group" "main" {
  name                = "asg-${var.environment}"
  vpc_zone_identifier = var.subnet_ids
  desired_capacity    = var.desired_capacity
  min_size            = var.min_size
  max_size            = var.max_size
  health_check_type   = "ELB"
  health_check_grace_period = 300
  default_cooldown    = 300

  termination_policies = ["OldestInstance"]

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "asg-instance-${var.environment}"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

# =============================================================================
# Auto Scaling Policy - Scale Up
# =============================================================================
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "asp-scale-up-${var.environment}"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

# =============================================================================
# Auto Scaling Policy - Scale Down
# =============================================================================
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "asp-scale-down-${var.environment}"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

# =============================================================================
# CloudWatch Alarm - Scale Up
# =============================================================================
resource "aws_cloudwatch_metric_alarm" "scale_up" {
  count = var.enable_scaling_policies ? 1 : 0

  alarm_name          = "alarm-scale-up-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = var.scale_up_threshold
  alarm_description   = "Scale up when CPU > ${var.scale_up_threshold}%"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_up.arn]
  ok_actions    = [aws_autoscaling_policy.scale_up.arn]
}

# =============================================================================
# CloudWatch Alarm - Scale Down
# =============================================================================
resource "aws_cloudwatch_metric_alarm" "scale_down" {
  count = var.enable_scaling_policies ? 1 : 0

  alarm_name          = "alarm-scale-down-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = var.scale_down_threshold
  alarm_description   = "Scale down when CPU < ${var.scale_down_threshold}%"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_down.arn]
  ok_actions    = [aws_autoscaling_policy.scale_down.arn]
}

# =============================================================================
# Data Sources
# =============================================================================
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# =============================================================================
# Locals
# =============================================================================
locals {
  default_user_data = <<-EOF
              #!/bin/bash
              yum update -y
              amazon-linux-extras install -y nginx1
              systemctl start nginx
              systemctl enable nginx
              
              # Install CloudWatch Agent
              curl -s https://s3.amazonaws.com/aws-cloudwatch/downloads/latest/awslogs-agent-setup.py -O
              python3 awslogs-agent-setup.py -n -r ${var.aws_region} -c default
              
              echo "Instance configured successfully" > /var/www/html/index.html
              EOF
}
