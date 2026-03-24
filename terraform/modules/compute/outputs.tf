# Compute Module Outputs

output "launch_template_id" {
  description = "ID of the launch template"
  value       = aws_launch_template.main.id
}

output "launch_template_name" {
  description = "Name of the launch template"
  value       = aws_launch_template.main.name
}

output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = aws_autoscaling_group.main.name
}

output "asg_arn" {
  description = "ARN of the Auto Scaling Group"
  value       = aws_autoscaling_group.main.arn
}

output "instance_ids" {
  description = "IDs of the EC2 instances"
  value       = aws_autoscaling_group.main.instance_ids
}

output "instance_iam_role_name" {
  description = "IAM role name for EC2 instances"
  value       = aws_iam_role.ec2.name
}

output "instance_iam_role_arn" {
  description = "IAM role ARN for EC2 instances"
  value       = aws_iam_role.ec2.arn
}

output "instance_profile_name" {
  description = "Instance profile name"
  value       = aws_iam_instance_profile.ec2.name
}

output "security_group_id" {
  description = "Compute security group ID"
  value       = aws_security_group.compute.id
}
