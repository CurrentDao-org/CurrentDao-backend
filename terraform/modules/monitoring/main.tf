# ============================================================================
# Monitoring Module (CloudWatch)
# ============================================================================
# Creates CloudWatch log groups, dashboards, and alarms

# =============================================================================
# CloudWatch Log Group
# =============================================================================
resource "aws_cloudwatch_log_group" "main" {
  name              = "/aws/${var.environment}/application"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "log-group-${var.environment}"
  })
}

# =============================================================================
# CloudWatch Log Stream
# =============================================================================
resource "aws_cloudwatch_log_stream" "main" {
  name           = "application-${var.environment}"
  log_group_name = aws_cloudwatch_log_group.main.name
}

# =============================================================================
# CloudWatch Dashboard
# =============================================================================
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "dashboard-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title = "ASG Metrics"
          metrics = [
            ["AWS/AutoScaling", "GroupInServiceInstances", "AutoScalingGroupName", var.asg_name],
            [".", "GroupMaxSize", ".", "."],
            [".", "GroupDesiredCapacity", ".", "."]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type = "metric"
        properties = {
          title = "CPU Utilization"
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", "*"],
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type = "metric"
        properties = {
          title = "ALB Metrics"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "*"],
            [".", "RequestCount", ".", "."]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type = "metric"
        properties = {
          title = "RDS Metrics"
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "*"],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeStorageSpace", ".", "."]
          ]
          period = 300
          stat   = "Average"
        }
      }
    ]
  })
}

# =============================================================================
# SNS Topic for Notifications
# =============================================================================
resource "aws_sns_topic" "main" {
  name = "sns-${var.environment}-alarms"

  tags = merge(var.tags, {
    Name = "sns-${var.environment}-alarms"
  })
}

# =============================================================================
# SNS Topic Subscription
# =============================================================================
resource "aws_sns_topic_subscription" "main" {
  count = var.notification_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.main.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# =============================================================================
# CloudWatch Composite Alarm - High Severity
# =============================================================================
resource "aws_cloudwatch_composite_alarm" "high_severity" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "alarm-high-severity-${var.environment}"
  alarm_description   = "Composite alarm for high severity issues"
  alarm_actions       = [aws_sns_topic.main.arn]
  ok_actions         = [aws_sns_topic.main.arn]

  # This is a placeholder - actual alarm rule would reference specific alarms
  rule = "ALARM(${aws_cloudwatch_log_group.main.name})"
}
