#!/bin/bash

# Production-grade shell script for starting the Django server using Gunicorn
# Version: 1.0.0

# Exit on any error
set -e

# Load environment variables
source /etc/environment

# Set default environment variables if not present
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-"arena.settings.production"}
export PYTHONPATH=${PYTHONPATH:-"/app/src/backend"}
export LOG_DIR=${LOG_DIR:-"/var/log/arena"}
export MAX_STARTUP_RETRIES=${MAX_STARTUP_RETRIES:-5}
export STARTUP_RETRY_DELAY=${STARTUP_RETRY_DELAY:-5}
export GRACEFUL_TIMEOUT=${GRACEFUL_TIMEOUT:-30}
export WORKER_TEMP_DIR=${WORKER_TEMP_DIR:-"/tmp/arena-worker"}

# Calculate optimal worker count based on CPU cores
CORES=$(nproc)
WORKERS=$(( CORES * 2 + 1 ))

# Configure Gunicorn settings
export GUNICORN_CMD_ARGS="--bind=0.0.0.0:8000 \
    --workers=${WORKERS} \
    --threads=1 \
    --timeout=30 \
    --max-requests=1000 \
    --max-requests-jitter=50 \
    --worker-class=uvicorn.workers.UvicornWorker \
    --worker-tmp-dir=${WORKER_TEMP_DIR} \
    --graceful-timeout=${GRACEFUL_TIMEOUT} \
    --keep-alive=5 \
    --access-logfile=${LOG_DIR}/access.log \
    --error-logfile=${LOG_DIR}/error.log \
    --log-level=info \
    --logger-class=core.logging.GunicornLogger \
    --statsd-host=localhost:8125 \
    --statsd-prefix=arena.gunicorn"

# Function to setup required directories
setup_environment() {
    echo "Setting up environment..."
    
    # Create required directories with proper permissions
    mkdir -p "${LOG_DIR}"
    mkdir -p "${WORKER_TEMP_DIR}"
    
    # Set proper permissions
    chmod 755 "${LOG_DIR}"
    chmod 755 "${WORKER_TEMP_DIR}"
    
    # Create log files if they don't exist
    touch "${LOG_DIR}/access.log"
    touch "${LOG_DIR}/error.log"
    chmod 644 "${LOG_DIR}/access.log"
    chmod 644 "${LOG_DIR}/error.log"
    
    echo "Environment setup complete"
}

# Function to check database connectivity
check_database() {
    echo "Checking database connectivity..."
    
    local retries=0
    while [ $retries -lt $MAX_STARTUP_RETRIES ]; do
        if python manage.py check_db_connection; then
            echo "Database connection successful"
            return 0
        fi
        
        retries=$((retries + 1))
        echo "Database connection attempt $retries failed, retrying in ${STARTUP_RETRY_DELAY}s..."
        sleep $STARTUP_RETRY_DELAY
    done
    
    echo "Failed to connect to database after $MAX_STARTUP_RETRIES attempts"
    return 1
}

# Function to apply database migrations
apply_migrations() {
    echo "Applying database migrations..."
    
    if ! python manage.py migrate --noinput; then
        echo "Failed to apply database migrations"
        return 1
    fi
    
    echo "Database migrations applied successfully"
    return 0
}

# Function to collect static files
collect_static() {
    echo "Collecting static files..."
    
    if ! python manage.py collectstatic --noinput; then
        echo "Failed to collect static files"
        return 1
    fi
    
    echo "Static files collected successfully"
    return 0
}

# Function to validate server configuration
validate_config() {
    echo "Validating server configuration..."
    
    # Check required environment variables
    local required_vars=(
        "DJANGO_SETTINGS_MODULE"
        "DJANGO_SECRET_KEY"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
        "DB_HOST"
        "REDIS_URL"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "Missing required environment variable: $var"
            return 1
        fi
    done
    
    # Validate directories exist
    if [ ! -d "$LOG_DIR" ] || [ ! -d "$WORKER_TEMP_DIR" ]; then
        echo "Required directories do not exist"
        return 1
    fi
    
    echo "Server configuration validated successfully"
    return 0
}

# Function to handle graceful shutdown
handle_shutdown() {
    echo "Received shutdown signal, initiating graceful shutdown..."
    
    # Send TERM signal to Gunicorn
    kill -TERM $GUNICORN_PID
    
    # Wait for Gunicorn to terminate
    wait $GUNICORN_PID
    
    echo "Server shutdown complete"
    exit 0
}

# Main startup sequence
main() {
    echo "Starting Arena server initialization..."
    
    # Setup environment
    if ! setup_environment; then
        echo "Environment setup failed"
        exit 1
    fi
    
    # Validate configuration
    if ! validate_config; then
        echo "Configuration validation failed"
        exit 1
    fi
    
    # Check database
    if ! check_database; then
        echo "Database check failed"
        exit 1
    fi
    
    # Apply migrations
    if ! apply_migrations; then
        echo "Migration application failed"
        exit 1
    fi
    
    # Collect static files
    if ! collect_static; then
        echo "Static file collection failed"
        exit 1
    fi
    
    echo "Starting Gunicorn server..."
    
    # Register signal handlers
    trap handle_shutdown SIGTERM SIGINT
    
    # Start Gunicorn
    gunicorn arena.wsgi:application &
    GUNICORN_PID=$!
    
    # Wait for Gunicorn to exit
    wait $GUNICORN_PID
}

# Start the server
main "$@"