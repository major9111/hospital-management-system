# Application Load Balancer fronts the gateway, with AWS WAFv2 attached
# directly to it (managed rule groups, cheaper to operate than self-hosted
# ModSecurity — see infra/waf/modsecurity.conf for the NGINX-based
# alternative if self-hosting instead).

resource "aws_lb" "main" {
  name               = "hospital-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.alb.id]

  # Spread across AZs automatically since subnets span 2 AZs.
  enable_deletion_protection = true
}

resource "aws_wafv2_web_acl" "main" {
  name  = "hospital-waf-${var.environment}"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # AWS-managed rule group: common exploits (SQLi, XSS, known bad inputs)
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "commonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Rate-based rule: blocks an IP sending >2000 requests / 5 min
  rule {
    name     = "RateLimitPerIP"
    priority = 2
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rateLimitPerIp"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "hospitalWaf"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# Gateway runs as an ECS Fargate service so it scales horizontally without
# managing servers directly — new tasks register with the ALB target group
# automatically as they pass health checks.
resource "aws_ecs_service" "gateway" {
  name            = "gateway"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.gateway.arn
  desired_count   = var.gateway_instance_count * 2 # x2 AZs
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.gateway.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway.arn
    container_name   = "gateway"
    container_port   = 3000
  }
}

resource "aws_appautoscaling_target" "gateway" {
  max_capacity       = 10
  min_capacity       = var.gateway_instance_count * 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.gateway.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale on CPU to keep latency low under load rather than waiting for
# requests to queue up.
resource "aws_appautoscaling_policy" "gateway_cpu" {
  name               = "gateway-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gateway.resource_id
  scalable_dimension = aws_appautoscaling_target.gateway.scalable_dimension
  service_namespace  = aws_appautoscaling_target.gateway.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 60.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
