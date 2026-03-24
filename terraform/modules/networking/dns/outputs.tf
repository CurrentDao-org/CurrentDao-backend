# DNS Module Outputs

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = try(aws_route53_zone.main[0].zone_id, "")
}

output "route53_zone_name" {
  description = "Route53 hosted zone name"
  value       = try(aws_route53_zone.main[0].name, "")
}

output "route53_zone_arn" {
  description = "Route53 hosted zone ARN"
  value       = try(aws_route53_zone.main[0].arn, "")
}

output "a_record_name" {
  description = "A record name"
  value       = try(aws_route53_record.main[0].name, "")
}
