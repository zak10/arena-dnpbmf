#!/bin/bash
# Arena MVP Health Check Script
# Version: 1.0.0
# Required packages: aws-cli 2.0+, curl 7.0+, jq 1.6+

set -e
set -o pipefail

# Global configuration
HEALTH_CHECK_INTERVAL=10
MAX_RETRIES=3
TIMEOUT=5
SUCCESS_THRESHOLD=2
HEALTH_CHECK_RETRIES=3
API_RESPONSE_TIME_THRESHOLD=2000  # 2 seconds in ms
AI_PROCESSING_TIME_THRESHOLD=5000 # 5 seconds in ms
LOG_FILE="/var/log/arena/healthcheck.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function with timestamp
log() {
    local level=$1
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up temporary resources..."
    rm -f /tmp/healthcheck_*.tmp
}

# Trap cleanup on script exit
trap cleanup EXIT

# Check ECS service health
check_ecs_service_health() {
    local cluster_name=$1
    local service_name=$2
    local status=0

    log "INFO" "Checking ECS service health for $service_name in cluster $cluster_name"

    # Get service details
    local service_details
    service_details=$(aws ecs describe-services \
        --cluster "$cluster_name" \
        --services "$service_name" \
        --output json 2>/dev/null)

    if [ $? -ne 0 ]; then
        log "ERROR" "Failed to get service details for $service_name"
        return 1
    }

    # Check running vs desired count
    local running_count
    local desired_count
    running_count=$(echo "$service_details" | jq -r '.services[0].runningCount')
    desired_count=$(echo "$service_details" | jq -r '.services[0].desiredCount')

    if [ "$running_count" -lt "$desired_count" ]; then
        log "WARN" "Service $service_name has $running_count/$desired_count tasks running"
        status=1
    fi

    # Check deployment status
    local deployment_status
    deployment_status=$(echo "$service_details" | jq -r '.services[0].deployments[0].status')
    if [ "$deployment_status" != "PRIMARY" ]; then
        log "WARN" "Service $service_name deployment status: $deployment_status"
        status=1
    fi

    # Get service metrics
    local cpu_utilization
    local memory_utilization
    cpu_utilization=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ECS \
        --metric-name CPUUtilization \
        --dimensions Name=ClusterName,Value="$cluster_name" Name=ServiceName,Value="$service_name" \
        --start-time "$(date -u -v-5M '+%Y-%m-%dT%H:%M:%SZ')" \
        --end-time "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
        --period 300 \
        --statistics Average \
        --output json | jq -r '.Datapoints[0].Average // 0')

    log "INFO" "Service $service_name CPU utilization: $cpu_utilization%"

    return $status
}

# Check RDS health
check_rds_health() {
    local instance_identifier=$1
    local status=0

    log "INFO" "Checking RDS health for instance $instance_identifier"

    # Check instance status
    local instance_status
    instance_status=$(aws rds describe-db-instances \
        --db-instance-identifier "$instance_identifier" \
        --output json 2>/dev/null | jq -r '.DBInstances[0].DBInstanceStatus')

    if [ "$instance_status" != "available" ]; then
        log "ERROR" "RDS instance $instance_identifier status: $instance_status"
        return 1
    fi

    # Check enhanced monitoring metrics
    local monitoring_status
    monitoring_status=$(aws rds describe-db-instances \
        --db-instance-identifier "$instance_identifier" \
        --output json | jq -r '.DBInstances[0].EnhancedMonitoringResourceArn')

    if [ -z "$monitoring_status" ]; then
        log "WARN" "Enhanced monitoring not enabled for $instance_identifier"
        status=1
    fi

    # Check storage metrics
    local free_storage
    free_storage=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/RDS \
        --metric-name FreeStorageSpace \
        --dimensions Name=DBInstanceIdentifier,Value="$instance_identifier" \
        --start-time "$(date -u -v-5M '+%Y-%m-%dT%H:%M:%SZ')" \
        --end-time "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
        --period 300 \
        --statistics Average \
        --output json | jq -r '.Datapoints[0].Average // 0')

    log "INFO" "RDS instance $instance_identifier free storage: $free_storage bytes"

    return $status
}

# Check API health
check_api_health() {
    local api_url=$1
    local status=0

    log "INFO" "Checking API health for endpoint $api_url"

    # Send health check request with timing
    local response
    local start_time
    local end_time
    local response_time

    start_time=$(date +%s%N)
    response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$api_url/health")
    end_time=$(date +%s%N)
    
    response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

    # Parse response
    local http_code
    http_code=$(echo "$response" | tail -n1)
    local response_body
    response_body=$(echo "$response" | head -n-1)

    # Check HTTP status
    if [ "$http_code" != "200" ]; then
        log "ERROR" "API health check failed with status $http_code"
        return 1
    fi

    # Check response time
    if [ "$response_time" -gt "$API_RESPONSE_TIME_THRESHOLD" ]; then
        log "WARN" "API response time ($response_time ms) exceeds threshold"
        status=1
    fi

    # Check AI processing time if available
    local ai_processing_time
    ai_processing_time=$(echo "$response_body" | jq -r '.ai_processing_time // 0')
    
    if [ "$ai_processing_time" -gt "$AI_PROCESSING_TIME_THRESHOLD" ]; then
        log "WARN" "AI processing time ($ai_processing_time ms) exceeds threshold"
        status=1
    }

    log "INFO" "API health check completed in $response_time ms"

    return $status
}

# Check Redis health
check_redis_health() {
    local redis_host=$1
    local status=0

    log "INFO" "Checking Redis health for host $redis_host"

    # Check cluster info
    local redis_info
    redis_info=$(aws elasticache describe-cache-clusters \
        --cache-cluster-id "$redis_host" \
        --show-cache-node-info \
        --output json 2>/dev/null)

    if [ $? -ne 0 ]; then
        log "ERROR" "Failed to get Redis cluster info for $redis_host"
        return 1
    }

    # Check cluster status
    local cluster_status
    cluster_status=$(echo "$redis_info" | jq -r '.CacheClusters[0].CacheClusterStatus')

    if [ "$cluster_status" != "available" ]; then
        log "ERROR" "Redis cluster $redis_host status: $cluster_status"
        return 1
    }

    # Check memory metrics
    local memory_usage
    memory_usage=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ElastiCache \
        --metric-name DatabaseMemoryUsagePercentage \
        --dimensions Name=CacheClusterId,Value="$redis_host" \
        --start-time "$(date -u -v-5M '+%Y-%m-%dT%H:%M:%SZ')" \
        --end-time "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
        --period 300 \
        --statistics Average \
        --output json | jq -r '.Datapoints[0].Average // 0')

    log "INFO" "Redis cluster $redis_host memory usage: $memory_usage%"

    return $status
}

# Main health check orchestrator
perform_health_checks() {
    local environment=$1
    local overall_status=0

    log "INFO" "Starting health checks for environment: $environment"

    # Load environment configuration
    local config_file="/etc/arena/config.$environment.json"
    if [ ! -f "$config_file" ]; then
        log "ERROR" "Configuration file not found: $config_file"
        return 1
    }

    # Read configuration
    local cluster_name
    local service_names
    local rds_instance
    local api_url
    local redis_host

    cluster_name=$(jq -r '.ecs.cluster_name' "$config_file")
    service_names=$(jq -r '.ecs.services[]' "$config_file")
    rds_instance=$(jq -r '.rds.instance_identifier' "$config_file")
    api_url=$(jq -r '.api.url' "$config_file")
    redis_host=$(jq -r '.redis.host' "$config_file")

    # Check ECS services
    for service in $service_names; do
        if ! check_ecs_service_health "$cluster_name" "$service"; then
            overall_status=1
        fi
    done

    # Check RDS
    if ! check_rds_health "$rds_instance"; then
        overall_status=1
    fi

    # Check API
    if ! check_api_health "$api_url"; then
        overall_status=1
    fi

    # Check Redis
    if ! check_redis_health "$redis_host"; then
        overall_status=1
    fi

    # Generate health report
    local report_file="/tmp/healthcheck_report_$(date +%Y%m%d_%H%M%S).json"
    {
        echo "{"
        echo "  \"timestamp\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\","
        echo "  \"environment\": \"$environment\","
        echo "  \"overall_status\": \"$([ $overall_status -eq 0 ] && echo "healthy" || echo "unhealthy")\","
        echo "  \"checks\": {"
        echo "    \"ecs\": {"
        echo "      \"cluster\": \"$cluster_name\","
        echo "      \"services\": $service_names"
        echo "    },"
        echo "    \"rds\": \"$rds_instance\","
        echo "    \"api\": \"$api_url\","
        echo "    \"redis\": \"$redis_host\""
        echo "  }"
        echo "}"
    } > "$report_file"

    log "INFO" "Health check report generated: $report_file"

    # Update CloudWatch metrics
    aws cloudwatch put-metric-data \
        --namespace "Arena/HealthChecks" \
        --metric-name "OverallHealth" \
        --value "$overall_status" \
        --dimensions Environment="$environment"

    return $overall_status
}

# Execute health checks if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ $# -ne 1 ]; then
        echo "Usage: $0 <environment>"
        exit 1
    fi

    perform_health_checks "$1"
fi