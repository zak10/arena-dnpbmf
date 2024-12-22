#!/bin/bash

# Arena MVP Rollback Script
# Version: 1.0.0
# Description: Enterprise-grade rollback script for Arena MVP deployments
# Required packages: aws-cli 2.0+, terraform 1.5+, jq 1.6+

set -euo pipefail
IFS=$'\n\t'

# Source required scripts with validation
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/healthcheck.sh"
source "${SCRIPT_DIR}/restore-db.sh"

# Global variables with defaults
readonly AWS_REGION=${AWS_REGION:-us-east-1}
readonly ROLLBACK_TIMEOUT=${ROLLBACK_TIMEOUT:-300}
readonly HEALTH_CHECK_RETRIES=${HEALTH_CHECK_RETRIES:-3}
readonly TERRAFORM_STATE_BUCKET=${TERRAFORM_STATE_BUCKET:-arena-terraform-state}
readonly LOG_FILE=${LOG_FILE:-/var/log/arena/rollback.log}
readonly PARALLEL_ROLLBACK=${PARALLEL_ROLLBACK:-true}

# Initialize logging
mkdir -p "$(dirname "${LOG_FILE}")"
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

# Logging function with timestamp and correlation ID
log_message() {
    local level=$1
    local message=$2
    local correlation_id=${3:-$(uuidgen)}
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] [${level}] [${correlation_id}] ${message}"
}

# Error handler with cleanup
error_handler() {
    local exit_code=$1
    local line_no=$2
    local correlation_id=$3
    
    log_message "ERROR" "Command failed at line ${line_no} with exit code ${exit_code}" "${correlation_id}"
    cleanup
    exit "${exit_code}"
}

trap 'error_handler $? $LINENO "${CORRELATION_ID}"' ERR

# Cleanup function
cleanup() {
    log_message "INFO" "Performing cleanup..." "${CORRELATION_ID}"
    
    # Remove temporary files
    find /tmp/arena-rollback-* -type f -exec shred -u {} \; 2>/dev/null || true
    
    # Release Terraform state lock if held
    if [[ -f "/tmp/arena-rollback-tf-lock" ]]; then
        terraform force-unlock -force "$(cat /tmp/arena-rollback-tf-lock)"
    fi
}

# Validate environment parameter
validate_environment() {
    local environment=$1
    
    log_message "INFO" "Validating environment: ${environment}" "${CORRELATION_ID}"
    
    # Sanitize input
    if [[ ! "${environment}" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        log_message "ERROR" "Invalid environment name format" "${CORRELATION_ID}"
        return 1
    }
    
    # Check allowed environments
    if [[ "${environment}" != "staging" && "${environment}" != "production" ]]; then
        log_message "ERROR" "Environment must be 'staging' or 'production'" "${CORRELATION_ID}"
        return 1
    }
    
    # Verify Terraform configuration
    local tf_dir="terraform/environments/${environment}"
    if [[ ! -d "${tf_dir}" || ! -f "${tf_dir}/terraform.tfvars" ]]; then
        log_message "ERROR" "Terraform configuration not found for environment" "${CORRELATION_ID}"
        return 1
    }
    
    return 0
}

# Get previous stable version
get_previous_version() {
    local environment=$1
    local service_name=$2
    
    log_message "INFO" "Getting previous version for ${service_name}" "${CORRELATION_ID}"
    
    # Get ECS service deployments
    local deployments
    deployments=$(aws ecs list-services \
        --cluster "arena-${environment}" \
        --service-name "${service_name}" \
        --region "${AWS_REGION}" \
        --query 'serviceArns[]' \
        --output json)
    
    # Get previous stable deployment
    local previous_version
    previous_version=$(aws ecs describe-services \
        --cluster "arena-${environment}" \
        --services "${deployments}" \
        --region "${AWS_REGION}" \
        --query 'services[0].deployments[?status==`PRIMARY` && runningCount==desiredCount].taskDefinition' \
        --output text)
    
    if [[ -z "${previous_version}" ]]; then
        log_message "ERROR" "No stable previous version found for ${service_name}" "${CORRELATION_ID}"
        return 1
    }
    
    echo "${previous_version}"
}

# Rollback ECS services
rollback_ecs_services() {
    local environment=$1
    local previous_version=$2
    
    log_message "INFO" "Rolling back ECS services to version ${previous_version}" "${CORRELATION_ID}"
    
    local services=("web-app" "api-server" "worker")
    local rollback_tasks=()
    
    for service in "${services[@]}"; do
        if [[ "${PARALLEL_ROLLBACK}" == "true" ]]; then
            rollback_service "${environment}" "${service}" "${previous_version}" &
            rollback_tasks+=($!)
        else
            rollback_service "${environment}" "${service}" "${previous_version}"
        fi
    done
    
    if [[ "${PARALLEL_ROLLBACK}" == "true" ]]; then
        for task in "${rollback_tasks[@]}"; do
            wait "${task}"
        done
    fi
}

# Rollback individual ECS service
rollback_service() {
    local environment=$1
    local service=$2
    local version=$3
    
    aws ecs update-service \
        --cluster "arena-${environment}" \
        --service "${service}" \
        --task-definition "${version}" \
        --region "${AWS_REGION}" \
        --force-new-deployment
        
    # Wait for deployment completion
    aws ecs wait services-stable \
        --cluster "arena-${environment}" \
        --services "${service}" \
        --region "${AWS_REGION}"
}

# Rollback infrastructure
rollback_infrastructure() {
    local environment=$1
    
    log_message "INFO" "Rolling back infrastructure for ${environment}" "${CORRELATION_ID}"
    
    # Initialize Terraform
    cd "terraform/environments/${environment}"
    terraform init \
        -backend-config="bucket=${TERRAFORM_STATE_BUCKET}" \
        -backend-config="key=${environment}/terraform.tfstate" \
        -backend-config="region=${AWS_REGION}"
    
    # Get and save state lock ID
    local lock_id
    lock_id=$(terraform force-unlock -force "$(terraform show -json | jq -r '.serial')")
    echo "${lock_id}" > "/tmp/arena-rollback-tf-lock"
    
    # Plan and apply rollback
    terraform plan -out=rollback.tfplan
    terraform apply -auto-approve rollback.tfplan
}

# Main rollback function
perform_rollback() {
    local environment=$1
    export CORRELATION_ID=$(uuidgen)
    
    log_message "INFO" "Starting rollback for environment: ${environment}" "${CORRELATION_ID}"
    
    # Validate environment
    validate_environment "${environment}" || exit 1
    
    # Create rollback audit trail
    local audit_file="/tmp/arena-rollback-${environment}-$(date +%Y%m%d_%H%M%S).json"
    {
        echo "{"
        echo "  \"correlation_id\": \"${CORRELATION_ID}\","
        echo "  \"environment\": \"${environment}\","
        echo "  \"timestamp\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\","
        echo "  \"initiated_by\": \"${USER}\""
        echo "}" 
    } > "${audit_file}"
    
    # Get previous stable versions
    local previous_version
    previous_version=$(get_previous_version "${environment}" "web-app")
    
    # Take pre-rollback snapshot
    log_message "INFO" "Taking pre-rollback snapshot" "${CORRELATION_ID}"
    aws rds create-db-snapshot \
        --db-instance-identifier "arena-${environment}" \
        --db-snapshot-identifier "arena-${environment}-pre-rollback-$(date +%Y%m%d-%H%M%S)" \
        --region "${AWS_REGION}"
    
    # Perform rollback operations
    rollback_ecs_services "${environment}" "${previous_version}"
    rollback_infrastructure "${environment}"
    
    # Restore database if needed
    if [[ -f "/tmp/arena-rollback-restore-db" ]]; then
        restore_backup "${environment}"
    fi
    
    # Verify system health
    for ((i=1; i<=HEALTH_CHECK_RETRIES; i++)); do
        if check_web_health && check_api_health && check_ecs_health; then
            log_message "INFO" "Rollback completed successfully" "${CORRELATION_ID}"
            cleanup
            return 0
        fi
        sleep 10
    done
    
    log_message "ERROR" "Health checks failed after rollback" "${CORRELATION_ID}"
    return 1
}

# Execute rollback if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -ne 1 ]]; then
        echo "Usage: $0 <environment>"
        exit 1
    fi
    
    perform_rollback "$1"
fi