# ALB Module Outputs

output "alb_id" {
  description = "ID of the ALB"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ARN of the ALB"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "ARN suffix of the ALB"
  value       = aws_lb.main.arn_suffix
}

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB"
  value       = aws_lb.main.zone_id
}

output "alb_target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.main.arn
}

output "alb_target_group_name" {
  description = "Name of the target group"
  value       = aws_lb_target_group.main.name
}

output "alb_listener_arns" {
  description = "ARNs of the listeners"
  value = {
    http  = aws_lb_listener.http.arn
    https = try(aws_lb_listener.https[0].arn, "")
  }
}
