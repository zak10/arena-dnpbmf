#!/bin/bash

# Arena MVP Backend Entrypoint Script
# Version: 1.0.0
# Purpose: Initialize and orchestrate backend services with health monitoring

# Enable strict error handling
set -e
set -o pipefail

# Default configuration values
MAX_STARTUP_RETRIES=${MAX_STARTUP_RETRIES:-5}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-30}
STARTUP_TIMEOUT=${STARTUP_TIMEOUT:-300}

# Logging utilities
log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_warning() {
    echo "[WARN] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Cleanup handler for graceful shutdown
cleanup() {
    local signal=$1
    log_info "Received signal: $signal - initiating graceful shutdown"
    
    # Stop services based on type
    case $SERVICE_TYPE in
        web)
            pkill -f "gunicorn" || true
            ;;
        worker)
            pkill -f "celery worker" || true
            ;;
        beat)
            pkill -f "celery beat" || true
            ;;
    esac
    
    # Remove temporary files
    rm -f /tmp/service_health_*
    rm -f /tmp/service_pid_*
    
    # Close database connections
    if [[ -n $DATABASE_URL ]]; then
        psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database()" || true
    fi
    
    log_info "Cleanup completed - exiting"
    exit 0
}

# Register signal handlers
trap 'cleanup SIGTERM' SIGTERM
trap 'cleanup SIGINT' SIGINT
trap 'cleanup SIGQUIT' SIGQUIT
trap 'cleanup SIGHUP' SIGHUP

# Environment validation
check_environment() {
    log_info "Validating environment configuration"
    
    # Required environment variables
    local required_vars=(
        "ENVIRONMENT"
        "DJANGO_SETTINGS_MODULE"
        "SERVICE_TYPE"
        "DATABASE_URL"
        "REDIS_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required environment variable $var is not set"
            return 1
        fi
    done
    
    # Validate ENVIRONMENT value
    if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
        log_error "Invalid ENVIRONMENT value: $ENVIRONMENT. Must be one of: development, staging, production"
        return 1
    fi
    
    # Validate SERVICE_TYPE value
    if [[ ! "$SERVICE_TYPE" =~ ^(web|worker|beat)$ ]]; then
        log_error "Invalid SERVICE_TYPE value: $SERVICE_TYPE. Must be one of: web, worker, beat"
        return 1
    }
    
    # Validate Django settings module
    if ! python -c "import $DJANGO_SETTINGS_MODULE" &>/dev/null; then
        log_error "Invalid DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE cannot be imported"
        return 1
    fi
    
    # Validate DATABASE_URL format
    if ! [[ "$DATABASE_URL" =~ ^postgres:// ]]; then
        log_error "Invalid DATABASE_URL format. Must start with postgres://"
        return 1
    fi
    
    # Validate REDIS_URL format
    if ! [[ "$REDIS_URL" =~ ^redis:// ]]; then
        log_error "Invalid REDIS_URL format. Must start with redis://"
        return 1
    fi
    
    log_info "Environment validation completed successfully"
    return 0
}

# Service dependency checker
wait_for_services() {
    local retry_count=0
    local start_time=$(date +%s)
    
    log_info "Waiting for required services to be ready"
    
    while [[ $retry_count -lt $MAX_STARTUP_RETRIES ]]; do
        local current_time=$(date +%s)
        local elapsed_time=$((current_time - start_time))
        
        if [[ $elapsed_time -gt $STARTUP_TIMEOUT ]]; then
            log_error "Service startup timeout after ${STARTUP_TIMEOUT}s"
            return 1
        fi
        
        # Check PostgreSQL
        if ! psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
            log_warning "PostgreSQL is not ready (attempt $((retry_count + 1))/$MAX_STARTUP_RETRIES)"
        else
            log_info "PostgreSQL connection successful"
            
            # Check Redis
            if ! redis-cli -u "$REDIS_URL" ping &>/dev/null; then
                log_warning "Redis is not ready (attempt $((retry_count + 1))/$MAX_STARTUP_RETRIES)"
            else
                log_info "Redis connection successful"
                return 0
            fi
        fi
        
        retry_count=$((retry_count + 1))
        sleep $((2 ** retry_count))  # Exponential backoff
    done
    
    log_error "Failed to connect to required services after $MAX_STARTUP_RETRIES attempts"
    return 1
}

# Database migration handler
run_migrations() {
    log_info "Checking and running database migrations"
    
    # Create backup of current migration state
    pg_dump -s "$DATABASE_URL" > /tmp/pre_migration_backup.sql
    
    if ! python manage.py showmigrations --plan | grep -q "\[ \]"; then
        log_info "No pending migrations found"
        return 0
    fi
    
    if ! python manage.py migrate --noinput; then
        log_error "Migration failed - initiating rollback"
        psql "$DATABASE_URL" < /tmp/pre_migration_backup.sql
        return 1
    fi
    
    log_info "Migrations completed successfully"
    return 0
}

# Service starter with health monitoring
start_service() {
    log_info "Starting service: $SERVICE_TYPE"
    
    local service_pid
    local health_check_file="/tmp/service_health_${SERVICE_TYPE}"
    
    case $SERVICE_TYPE in
        web)
            source scripts/start-server.sh
            if [[ "$ENVIRONMENT" == "development" ]]; then
                start_development_server &
            else
                start_production_server &
            fi
            service_pid=$!
            ;;
        worker)
            source scripts/start-celery.sh
            start_worker &
            service_pid=$!
            ;;
        beat)
            source scripts/start-celery.sh
            start_beat &
            service_pid=$!
            ;;
        *)
            log_error "Unknown service type: $SERVICE_TYPE"
            return 1
            ;;
    esac
    
    echo $service_pid > "/tmp/service_pid_${SERVICE_TYPE}"
    
    # Monitor service health
    while true; do
        sleep $HEALTH_CHECK_INTERVAL
        
        if ! kill -0 $service_pid 2>/dev/null; then
            log_error "Service $SERVICE_TYPE (PID: $service_pid) has died"
            return 1
        fi
        
        # Service-specific health checks
        case $SERVICE_TYPE in
            web)
                if ! curl -s http://localhost:8000/health/ &>/dev/null; then
                    log_error "Web service health check failed"
                    return 1
                fi
                ;;
            worker)
                if ! celery -A arena inspect ping &>/dev/null; then
                    log_error "Celery worker health check failed"
                    return 1
                fi
                ;;
            beat)
                if ! celery -A arena inspect ping -d celerybeat@%h &>/dev/null; then
                    log_error "Celery beat health check failed"
                    return 1
                fi
                ;;
        esac
        
        log_info "Service $SERVICE_TYPE health check passed"
    done
}

# Main execution flow
main() {
    log_info "Starting Arena MVP backend entrypoint script"
    
    # Validate environment
    if ! check_environment; then
        log_error "Environment validation failed"
        exit 1
    fi
    
    # Wait for required services
    if ! wait_for_services; then
        log_error "Required services are not available"
        exit 1
    fi
    
    # Run migrations if web service
    if [[ "$SERVICE_TYPE" == "web" ]]; then
        if ! run_migrations; then
            log_error "Database migration failed"
            exit 1
        fi
    fi
    
    # Start and monitor service
    if ! start_service; then
        log_error "Service startup failed"
        exit 1
    fi
}

# Execute main function
main