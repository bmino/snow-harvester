export
AWS_PROFILE=snowball
#TF_LOG=DEBUG
init:
	terraform init
plan:
	terraform plan
refresh:
	terraform refresh
show:
	terraform show
deploy:
	terraform taint -allow-missing aws_ecs_task_definition.default
	terraform apply -auto-approve