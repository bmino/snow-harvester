locals {
  task_definition = jsonencode([
    {
      name      = local.task_name
      image     = aws_ecr_repository.repo.repository_url
      essential = true,
      dockerLabels = {
        "com.datadoghq.ad.instances" : "[{\"host\":\"%%host%%\"}]",
        "com.datadoghq.ad.check_names" : "[\"harvester\"]"
      },
      environment = [
        {
          name  = "SNOWBALL_KEY"
          value = data.aws_ssm_parameter.snowball_key.value
        },
         {
          name  = "DISCORD_KEY"
          value = data.aws_ssm_parameter.discord_key.value
        },
        {
          name =  "WEBHOOK_URL",
          value = data.aws_ssm_parameter.webhook.value
        },
        { 
          name = "WEBHOOK_OPTIMIZER"
          value = data.aws_ssm_parameter.optimizer.value
        }
      ],
      logConfiguration = {
        logDriver = "awsfirelens"

        options = {
          Name             = "datadog"
          apikey           = data.aws_ssm_parameter.dd_dog.value
          "dd_service"     = "${local.env}-${local.task_name}"
          "Host"           = "http-intake.logs.datadoghq.com"
          "dd_source"      = "${local.env}-${local.task_name}"
          "dd_message_key" = "log"
          "dd_tags"        = "project:${local.env}-${local.task_name}"
          "TLS"            = "on"
          "provider"       = "ecs"
        }
      }
    },
    {
      name      = "datadog-agent"
      image     = "datadog/agent:latest"
      essential = true
      environment = [
        {
          name  = "DD_API_KEY",
          value = data.aws_ssm_parameter.dd_dog.value
        },
        {
          name  = "ECS_FARGATE"
          value = "true"
        }
      ]
    },
    {
      name      = "log_router"
      image     = "amazon/aws-for-fluent-bit:2.19.0"
      essential = true
      firelensConfiguration = {
        type = "fluentbit"
        options = {
          "enable-ecs-log-metadata" = "true"
        }
      }
    }
  ])
}

resource "aws_ecs_cluster" "this" {
  name = "${local.env}-${local.cluster_name}"
}

resource "aws_ecr_repository" "repo" {
  name                 = "${local.env}-${local.task_name}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = local.env
    Name        = "${local.env}-${local.task_name}"
  }
}

module "ecs_scheduled_task" {
  source                         = "git@github.com:Snowball-Finance/terraform-ecs-schedule-task.git"
  name                           = "${local.env}-${local.task_name}"
  schedule_expression            = "rate(8 hours)"
  cluster_arn                    = aws_ecs_cluster.this.arn
  subnets                        = data.terraform_remote_state.vpc.outputs.private_subnets
  container_definitions          = local.task_definition
  is_enabled                     = true
  task_count                     = 1
  platform_version               = "LATEST"
  assign_public_ip               = false
  security_groups                = [aws_security_group.this.id]
  cpu                            = 256
  memory                         = 512
  requires_compatibilities       = ["FARGATE"]
  iam_path                       = "/service_role/"
  description                    = "Scheduled ECS Task for Harvester"
  enabled                        = true
  create_ecs_events_role         = false
  ecs_events_role_arn            = aws_iam_role.ecs_events.arn
  create_ecs_task_execution_role = false
  ecs_task_execution_role_arn    = aws_iam_role.ecs_task_execution.arn
  task_role_arn                   = aws_iam_role.task_role.arn

  tags = {
    Environment = local.env
    Project     = local.project
  }
}

resource "aws_security_group" "this" {
  name   = "${local.env}-${local.task_name}-Task-SG"
  vpc_id = data.terraform_remote_state.vpc.outputs.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${local.env}-${local.task_name}-Task-SG"
    Environment = local.env
  }
}
