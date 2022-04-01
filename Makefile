export
AWS_DEFAULT_PROFILE=snowball
SERVICE_NAME=harvester
ECS_CLUSTER=${env}-snowball-scheduled-task
SERVICE_TAG=1.0.5
AWS_REGION=us-west-2
ECR_REPO_URL=672139136522.dkr.ecr.us-west-2.amazonaws.com/${env}-${SERVICE_NAME}

all: build push

test-envvars:
	@[ "${env}" ] || ( echo "env var is not set"; exit 1 )

build: test-envvars
	docker build --platform linux/amd64 -t $(ECR_REPO_URL):${SERVICE_TAG} .

push: test-envvars
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_REPO_URL)
	docker push $(ECR_REPO_URL):${SERVICE_TAG} 

deploy: test-envvars
	aws ecs --region $(AWS_REGION) update-service --cluster $(ECS_CLUSTER) --service ${SERVICE_NAME} --force-new-deployment