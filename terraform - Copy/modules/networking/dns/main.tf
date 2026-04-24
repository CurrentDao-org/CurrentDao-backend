# ============================================================================
# DNS Module (Route53)
# ============================================================================
# Creates Route53 hosted zone and DNS records

# =============================================================================
# Route53 Hosted Zone
# =============================================================================
resource "aws_route53_zone" "main" {
  count = var.enable_dns ? 1 : 0

  name = var.domain_name

  tags = merge(var.tags, {
    Name = "zone-${var.environment}"
  })
}

# =============================================================================
# DNS Record - A Record
# =============================================================================
resource "aws_route53_record" "main" {
  count = var.enable_dns ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# =============================================================================
# DNS Record - AAAA Record
# =============================================================================
resource "aws_route53_record" "main_aaaa" {
  count = var.enable_dns ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# =============================================================================
# DNS Record - WWW
# =============================================================================
resource "aws_route53_record" "www" {
  count = var.enable_dns ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
