# ============================================================================
# ALB Module (Application Load Balancer)
# ============================================================================
# Creates Application Load Balancer with HTTPS support

resource "aws_lb" "main" {
  name               = "alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
  enable_cross_zone_load_balancing = true
  enable_http2 = true

  access_logs {
    bucket  = var.log_bucket_name
    prefix  = "alb-${var.environment}"
    enabled = var.enable_access_logs
  }

  tags = merge(var.tags, {
    Name = "alb-${var.environment}"
  })
}

# =============================================================================
# Target Group
# =============================================================================
resource "aws_lb_target_group" "main" {
  name     = "tg-${var.environment}"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = var.health_check_path
    matcher             = "200"
  }

  target_type = var.target_type

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "tg-${var.environment}"
  })
}

# =============================================================================
# Target Group Attachment (Instance)
# =============================================================================
resource "aws_lb_target_group_attachment" "instance" {
  count = var.target_type == "instance" && length(var.target_instance_ids) > 0 ? length(var.target_instance_ids) : 0

  target_group_arn = aws_lb_target_group.main.arn
  target_id        = var.target_instance_ids[count.index]
  port             = 80
}

# =============================================================================
# Target Group Attachment (IP)
# =============================================================================
resource "aws_lb_target_group_attachment" "ip" {
  count = var.target_type == "ip" && length(var.target_ip_ids) > 0 ? length(var.target_ip_ids) : 0

  target_group_arn = aws_lb_target_group.main.arn
  target_id        = var.target_ip_ids[count.index]
  port             = 80
}

# =============================================================================
# HTTP Listener
# =============================================================================
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# =============================================================================
# HTTPS Listener
# =============================================================================
resource "aws_lb_listener" "https" {
  count = var.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# =============================================================================
# CloudWatch Alarms
# =============================================================================
resource "aws_cloudwatch_metric_alarm" "target_response_time" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "alb-response-time-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "ALB target response time high"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "target_unhealthy_hosts" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "alb-unhealthy-hosts-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "ALB has unhealthy hosts"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.main.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_errors" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "alb-5xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB target 5XX errors high"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}
