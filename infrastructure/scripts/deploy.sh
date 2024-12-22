#!/bin/bash
# Arena MVP Deployment Script
# Version: 1.0.0
# Required: aws-cli 2.0+, terraform 1.5+, docker 24+, jq 1.6+

set -e
set -o pipefail

# Import health check functions
source "$(dirname "$0")/healthcheck.sh"

# Global configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
ECR_REPOSITORY_BACKEND=${ECR_REPOSITORY_BACKEND:-"arena-backend"}
ECR_REPOSITORY_FRONTEND=${ECR_REPOSITORY_FRONTEND:-"arena-frontend"}
DEPLOYMENT_TIMEOUT=${DEPLOYMENT_TIMEOUT:-600}
HEALTH_CHECK_RETRIES=${HEALTH_CHECK_RETRIES:-3}
LOG_FILE=${LOG_FILE:-"/var/log/arena/deployments.log"}
STATE_BACKUP_PATH=${STATE_BACKUP_PATH:-"/var/backup/terraform"}
PARALLEL_BUILDS=${PARALLEL_BUILDS:-"true"}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$STATE_BACKUP_PATH"

# Logging function with timestamp
log() {
    local level=$1
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# Validate deployment environment and prerequisites
validate_environment() {
    local environment=$1
    
    log "INFO" "Validating environment: $environment"
    
    # Validate environment name
    if [[ ! "$environment" =~ ^(staging|production)$ ]]; then
        log "ERROR" "Invalid environment. Must be 'staging' or 'production'"
        return 1
    }
    
    # Check required tools
    local required_tools=("aws" "terraform" "docker" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool not found: $tool"
            return 1
        fi
    done
    
    # Verify environment directory
    if [ ! -d "../terraform/environments/$environment" ]; then
        log "ERROR" "Environment directory not found: ../terraform/environments/$environment"
        return 1
    }
    
    # Check terraform.tfvars
    if [ ! -f "../terraform/environments/$environment/terraform.tfvars" ]; then
        log "ERROR" "terraform.tfvars not found for environment: $environment"
        return 1
    }
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log "ERROR" "Invalid AWS credentials"
        return 1
    }
    
    # Check ECR repositories
    for repo in "$ECR_REPOSITORY_BACKEND" "$ECR_REPOSITORY_FRONTEND"; do
        if ! aws ecr describe-repositories --repository-names "$repo" &> /dev/null; then
            log "ERROR" "ECR repository not found: $repo"
            return 1
        fi
    done
    
    log "INFO" "Environment validation successful"
    return 0
}

# Build and push Docker images to ECR
build_and_push_images() {
    local environment=$1
    local version_tag=$2
    local image_uris=()
    
    log "INFO" "Building and pushing images for environment: $environment"
    
    # Get ECR login token
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin \
        "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Build function
    build_image() {
        local repo=$1
        local dockerfile=$2
        local context=$3
        
        log "INFO" "Building image for $repo"
        docker build -t "$repo:$version_tag" \
            -t "$repo:latest" \
            -f "$dockerfile" "$context" \
            --build-arg ENVIRONMENT="$environment"
        
        # Generate and store image checksum
        docker images --no-trunc --quiet "$repo:$version_tag" > "/tmp/${repo##*/}_checksum"
    }
    
    # Build images in parallel if enabled
    if [ "$PARALLEL_BUILDS" = "true" ]; then
        build_image "$ECR_REPOSITORY_BACKEND" "../../backend/Dockerfile" "../../backend" &
        build_image "$ECR_REPOSITORY_FRONTEND" "../../frontend/Dockerfile" "../../frontend" &
        wait
    else
        build_image "$ECR_REPOSITORY_BACKEND" "../../backend/Dockerfile" "../../backend"
        build_image "$ECR_REPOSITORY_FRONTEND" "../../frontend/Dockerfile" "../../frontend"
    fi
    
    # Push images with retry logic
    push_image() {
        local repo=$1
        local max_retries=3
        local attempt=1
        
        while [ $attempt -le $max_retries ]; do
            if docker push "$repo:$version_tag" && docker push "$repo:latest"; then
                local remote_checksum
                remote_checksum=$(aws ecr describe-images --repository-name "${repo##*/}" \
                    --image-ids imageTag="$version_tag" --query 'imageDetails[0].imageDigest' --output text)
                local local_checksum
                local_checksum=$(cat "/tmp/${repo##*/}_checksum")
                
                if [ "$remote_checksum" = "$local_checksum" ]; then
                    log "INFO" "Successfully pushed and verified $repo:$version_tag"
                    image_uris+=("$repo:$version_tag")
                    return 0
                fi
            fi
            
            log "WARN" "Push attempt $attempt failed for $repo, retrying..."
            ((attempt++))
            sleep 5
        done
        
        log "ERROR" "Failed to push image after $max_retries attempts: $repo"
        return 1
    }
    
    push_image "$ECR_REPOSITORY_BACKEND"
    push_image "$ECR_REPOSITORY_FRONTEND"
    
    # Return image URIs as JSON
    echo "{\"backend\":\"${image_uris[0]}\",\"frontend\":\"${image_uris[1]}\"}"
}

# Deploy infrastructure using Terraform
deploy_infrastructure() {
    local environment=$1
    
    log "INFO" "Deploying infrastructure for environment: $environment"
    
    # Create state backup
    local backup_file="$STATE_BACKUP_PATH/terraform-${environment}-$(date +%Y%m%d_%H%M%S).tfstate"
    cp "../terraform/environments/$environment/terraform.tfstate" "$backup_file" || true
    
    # Initialize Terraform
    cd "../terraform/environments/$environment"
    terraform init -backend=true
    
    # Select workspace
    terraform workspace select "$environment" || terraform workspace new "$environment"
    
    # Plan and apply changes
    terraform plan -out=tfplan
    
    if ! timeout "$DEPLOYMENT_TIMEOUT" terraform apply -auto-approve tfplan; then
        log "ERROR" "Terraform apply failed or timed out"
        return 1
    fi
    
    # Verify deployment
    if ! terraform show; then
        log "ERROR" "Failed to verify Terraform state"
        return 1
    fi
    
    # Tag successful deployment
    aws resourcegroupstaggingapi tag-resources \
        --tags "LastDeployment=$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
        --resource-arn-list $(terraform show -json | jq -r '.values.root_module.resources[].values.arn')
    
    return 0
}

# Update ECS services
update_ecs_services() {
    local environment=$1
    local image_uris=$2
    
    log "INFO" "Updating ECS services for environment: $environment"
    
    # Extract image URIs
    local backend_image
    local frontend_image
    backend_image=$(echo "$image_uris" | jq -r '.backend')
    frontend_image=$(echo "$image_uris" | jq -r '.frontend')
    
    # Get cluster name
    local cluster_name
    cluster_name=$(aws ecs list-clusters | jq -r ".clusterArns[] | select(contains(\"$environment\"))")
    
    # Update services
    for service in backend frontend; do
        local image_uri
        image_uri=$(eval echo \$${service}_image)
        
        # Register new task definition
        local task_def
        task_def=$(aws ecs describe-task-definition \
            --task-definition "$environment-$service" \
            --query 'taskDefinition' | \
            jq ".containerDefinitions[0].image = \"$image_uri\"")
        
        local new_task_def
        new_task_def=$(aws ecs register-task-definition \
            --family "$environment-$service" \
            --cli-input-json "$task_def")
        
        # Update service
        aws ecs update-service \
            --cluster "$cluster_name" \
            --service "$environment-$service" \
            --task-definition "$environment-$service" \
            --force-new-deployment
        
        # Monitor deployment
        local timeout_count=0
        while [ $timeout_count -lt $DEPLOYMENT_TIMEOUT ]; do
            local deployment_status
            deployment_status=$(aws ecs describe-services \
                --cluster "$cluster_name" \
                --services "$environment-$service" \
                --query 'services[0].deployments[0].status' \
                --output text)
            
            if [ "$deployment_status" = "PRIMARY" ]; then
                log "INFO" "Service $service deployment completed successfully"
                break
            fi
            
            ((timeout_count+=10))
            sleep 10
        done
        
        if [ $timeout_count -ge $DEPLOYMENT_TIMEOUT ]; then
            log "ERROR" "Service $service deployment timed out"
            return 1
        fi
    done
    
    return 0
}

# Main deployment function
perform_deployment() {
    local environment=$1
    local version_tag=$2
    local deployment_id
    deployment_id=$(uuidgen)
    
    log "INFO" "Starting deployment $deployment_id for environment: $environment"
    
    # Initialize deployment
    if ! validate_environment "$environment"; then
        log "ERROR" "Environment validation failed"
        return 1
    fi
    
    # Build and push images
    local image_uris
    if ! image_uris=$(build_and_push_images "$environment" "$version_tag"); then
        log "ERROR" "Failed to build and push images"
        return 1
    fi
    
    # Deploy infrastructure
    if ! deploy_infrastructure "$environment"; then
        log "ERROR" "Infrastructure deployment failed"
        return 1
    fi
    
    # Update ECS services
    if ! update_ecs_services "$environment" "$image_uris"; then
        log "ERROR" "ECS service update failed"
        return 1
    fi
    
    # Perform health checks
    local retry_count=0
    while [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; do
        if perform_health_checks "$environment"; then
            log "INFO" "Deployment $deployment_id completed successfully"
            return 0
        fi
        
        log "WARN" "Health check failed, retrying... ($((retry_count + 1))/$HEALTH_CHECK_RETRIES)"
        ((retry_count++))
        sleep 30
    done
    
    log "ERROR" "Deployment $deployment_id failed health checks"
    # Source rollback script and execute if available
    if [ -f "$(dirname "$0")/rollback.sh" ]; then
        source "$(dirname "$0")/rollback.sh"
        perform_rollback "$environment" "$deployment_id"
    fi
    
    return 1
}

# Execute deployment if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ $# -ne 2 ]; then
        echo "Usage: $0 <environment> <version_tag>"
        exit 1
    fi
    
    perform_deployment "$1" "$2"
fi