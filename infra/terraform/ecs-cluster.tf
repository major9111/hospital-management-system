resource "aws_ecs_cluster" "main" {
  name = "hospital-network-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled" # needed for the CPU-based autoscaling metric
  }
}

resource "aws_lb_target_group" "gateway" {
  name        = "gateway-tg-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # required for Fargate

  health_check {
    path                = "/health"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_ecs_task_definition" "gateway" {
  family                   = "gateway"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "gateway"
      image     = "REPLACE_WITH_ECR_IMAGE_URI:latest"
      essential = true
      portMappings = [{ containerPort = 3000, protocol = "tcp" }]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "arn:aws:secretsmanager:REGION:ACCOUNT:secret:database-url" },
        { name = "JWT_ACCESS_SECRET", valueFrom = "arn:aws:secretsmanager:REGION:ACCOUNT:secret:jwt-access-secret" },
        { name = "JWT_REFRESH_SECRET", valueFrom = "arn:aws:secretsmanager:REGION:ACCOUNT:secret:jwt-refresh-secret" },
        { name = "INTERNAL_SERVICE_SECRET", valueFrom = "arn:aws:secretsmanager:REGION:ACCOUNT:secret:internal-service-secret" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/gateway"
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "gateway"
        }
      }
    }
  ])
}

resource "aws_iam_role" "ecs_execution" {
  name = "ecs-execution-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
