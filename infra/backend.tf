locals {
  remote_state_bucket  = "prod-snowball-terraform-state"
  backend_region       = "us-west-2"
  vpc_remote_state_key = "vpc.tfstate"
  project              = "harvester"
}

provider "aws" {
  region  = "us-west-2"
}

terraform {
  required_providers {
    aws = { 
      source = "hashicorp/aws"
      version = "4.0.0"
    }
  }
  backend "s3" {
    encrypt        = true
    key            = "harvester.tfstate"
    bucket         = "prod-snowball-terraform-state"
    dynamodb_table = "prod-snowball-terraform-state-lock"
    region         = "us-west-2"
  }
}

data "terraform_remote_state" "vpc" {
  backend = "s3"

  config = {
    region = local.backend_region
    bucket = local.remote_state_bucket
    key    = local.vpc_remote_state_key
  }
}
