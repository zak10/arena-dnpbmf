# Terraform AWS Networking Module Outputs
# Version: 1.5.0
# Purpose: Define outputs for VPC, subnet, security group and other networking resources

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC used for network isolation"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC for network planning"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "private_subnet_ids" {
  description = "IDs of private subnets for application tier resources"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of public subnets for load balancers and NAT gateways"
  value       = aws_subnet.public[*].id
}

output "private_subnet_azs" {
  description = "Availability zones of private subnets for multi-AZ deployment"
  value       = aws_subnet.private[*].availability_zone
}

output "public_subnet_azs" {
  description = "Availability zones of public subnets for multi-AZ deployment"
  value       = aws_subnet.public[*].availability_zone
}

# NAT Gateway Outputs
output "nat_gateway_ids" {
  description = "IDs of NAT gateways for private subnet internet access"
  value       = aws_nat_gateway.main[*].id
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the Application Load Balancer security group"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "ID of the application tier security group"
  value       = aws_security_group.app.id
}

output "vpc_endpoint_security_group_id" {
  description = "ID of the VPC endpoints security group"
  value       = aws_security_group.vpc_endpoints.id
}

# Network ACL Outputs
output "private_nacl_id" {
  description = "ID of the private subnets network ACL"
  value       = aws_network_acl.private.id
}

# VPC Endpoint Outputs
output "vpc_endpoints" {
  description = "Map of VPC endpoint IDs by service"
  value       = {
    for k, v in aws_vpc_endpoint.endpoints : k => v.id
  }
}

# Flow Logs Outputs
output "vpc_flow_log_group" {
  description = "Name of the CloudWatch log group for VPC flow logs"
  value       = aws_cloudwatch_log_group.flow_logs.name
}

output "vpc_flow_log_role_arn" {
  description = "ARN of the IAM role used for VPC flow logs"
  value       = aws_iam_role.flow_logs.arn
}