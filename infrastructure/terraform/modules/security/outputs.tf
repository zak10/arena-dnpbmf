# Security Module Outputs
# Terraform version: >=1.5.0
# AWS Provider version: ~> 5.0

# WAF Web ACL ARN Output
# SECURITY NOTICE: WAF provides critical protection against OWASP Top 10 vulnerabilities.
# Ensure WAF rules are properly configured and regularly audited.
output "waf_acl_arn" {
  description = <<-EOT
    ARN of the WAF web ACL for ALB association.
    IMPORTANT: Ensure WAF rules are properly configured for web application protection.
    Security considerations:
    - Monitor WAF metrics and logs for potential attacks
    - Regularly review and update WAF rules
    - Maintain compliance with security standards
  EOT
  value       = aws_wafv2_web_acl.arena-waf.arn
  sensitive   = false

  # Validation to ensure ARN follows AWS format
  validation {
    condition     = can(regex("^arn:aws:wafv2:", var.waf_acl_arn))
    error_message = "WAF ACL ARN must be a valid AWS WAFv2 ARN format."
  }
}

# Application Security Group ID Output
# SECURITY NOTICE: Security groups are the first line of defense for network security.
# Follow least privilege principle when configuring rules.
output "app_security_group_id" {
  description = <<-EOT
    ID of the security group for application containers.
    NOTE: Review security group rules periodically to maintain least privilege access.
    Security considerations:
    - Minimize inbound rules to required ports only
    - Use specific CIDR ranges instead of 0.0.0.0/0
    - Document all rule changes with justification
  EOT
  value       = aws_security_group.arena-app-sg.id
  sensitive   = false

  # Validation to ensure SG ID follows AWS format
  validation {
    condition     = can(regex("^sg-", var.app_security_group_id))
    error_message = "Security Group ID must start with 'sg-' prefix."
  }
}

# SSL Certificate ARN Output
# SECURITY NOTICE: SSL/TLS certificates are crucial for data encryption in transit.
# Monitor expiration dates and ensure automatic renewal.
output "ssl_certificate_arn" {
  description = <<-EOT
    ARN of the SSL certificate for HTTPS listeners.
    WARNING: Monitor certificate expiration and ensure automatic renewal is configured.
    Security considerations:
    - Use only TLS 1.2 or higher
    - Configure secure cipher suites
    - Enable HSTS for all domains
  EOT
  value       = aws_acm_certificate.arena-cert.arn
  sensitive   = false

  # Validation to ensure ARN follows AWS format
  validation {
    condition     = can(regex("^arn:aws:acm:", var.ssl_certificate_arn))
    error_message = "SSL Certificate ARN must be a valid AWS ACM ARN format."
  }
}

# Application IAM Role ARN Output
# SECURITY NOTICE: IAM roles control access to AWS services.
# Implement least privilege access and regularly audit permissions.
output "app_role_arn" {
  description = <<-EOT
    ARN of the IAM role for application permissions.
    CRITICAL: Regularly audit role permissions to enforce least privilege principle.
    Security considerations:
    - Avoid wildcard permissions
    - Use specific resource ARNs
    - Implement role assumption conditions
    - Enable AWS CloudTrail for role usage auditing
  EOT
  value       = aws_iam_role.arena-app-role.arn
  sensitive   = false

  # Validation to ensure ARN follows AWS format
  validation {
    condition     = can(regex("^arn:aws:iam::", var.app_role_arn))
    error_message = "IAM Role ARN must be a valid AWS IAM ARN format."
  }
}