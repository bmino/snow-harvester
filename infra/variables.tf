locals {
  cluster_name = "snowball-scheduled-task"
  env          = "prod"
  task_name    = "harvester"
  version      = "1.0.5"
}

data "aws_ssm_parameter" "snowball_key" {
  name  = "${local.env}-snowball-key"
}

data "aws_ssm_parameter" "discord_key" {
  name = "${local.env}-discord-key"
}

data "aws_ssm_parameter" "dd_dog" {
  name = "${local.env}-data-dog-api-key"
}

data "aws_ssm_parameter" "webhook" {
  name = "${local.env}-harvester-webhook"
}

data "aws_ssm_parameter" "snowtrace" { 
  name = "${local.env}-snowtrace-key"
}

data "aws_ssm_parameter" "optimizer" { 
  name = "${local.env}-optimizer-webhook"
}

data "aws_kms_key" "kms_key" {
  key_id = "alias/${local.env}-kms-key"
}
