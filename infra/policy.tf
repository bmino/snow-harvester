data "aws_iam_policy_document" "ecs_task_policy" {
  statement {
    sid     = "AllowECSAndTaskAssumeRole"
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["ecs.amazonaws.com", "ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_ecs_role" {
  name               = "${local.env}-harvester-task-ecs-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_policy.json
}

data "aws_iam_policy_document" "task_policy" {
  
   statement {
    sid    = "AllowReadToResourcesInListToTask"
    effect = "Allow"
    actions = [
      "ecs:*",
      "ecr:*"
    ]

    resources = ["*"]
  }

  statement {
    sid    = "AllowDecrypt"
    effect = "Allow"
    actions = [
      "kms:Decrypt"
    ]
    resources = [data.aws_kms_key.kms_key.arn]
  }

   statement {
    sid    = "AllowAccessToSSM"
    effect = "Allow"
    actions = [
      "ssm:GetParameters"
    ]
    resources = [
      data.aws_ssm_parameter.dd_dog.arn,
      data.aws_ssm_parameter.discord_key.arn,
      data.aws_ssm_parameter.snowball_key.arn,
      data.aws_ssm_parameter.snowtrace.arn
    ]
  }
}

resource "aws_iam_policy" "policy" {
  name = "${local.env}-${local.cluster_name}-harvester-task-policy"
  policy = data.aws_iam_policy_document.task_policy.json
}

resource "aws_iam_role_policy_attachment" "task" {
  role       = aws_iam_role.task_ecs_role.name
  policy_arn = aws_iam_policy.policy.arn
}
