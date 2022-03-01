locals {
  cluster_name = "snowball-scheduled-task"
  env          = "prod"
  task_name    = "harvester"
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

data "aws_ssm_parameter" "optimizer" { 
  name = "${local.env}-optimizer-webhook"
}

