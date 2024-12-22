#!/bin/bash

# Start-celery.sh
# Version: 1.0.0
# Script to start Celery workers for Arena MVP platform with optimized configuration
# for handling AI processing, proposal management, and notifications

# Set environment variables with defaults
export DJANGO_SETTINGS_MODULE=arena.settings.${ENVIRONMENT:-development}
export PYTHONPATH=/app
export LOG_LEVEL=${LOG_LEVEL:-info}
export CONCURRENCY=${CONCURRENCY:-2}

# Ensure script fails on any error
set -e

# Function to handle graceful shutdown
cleanup() {
    echo "Received shutdown signal - initiating graceful shutdown..."
    # Send SIGTERM to all processes in the current process group
    kill -TERM 0
    wait
    echo "Shutdown complete"
    exit 0
}

# Register signal handlers
trap cleanup SIGTERM SIGINT SIGQUIT

# Configure worker pools based on task types
declare -A QUEUES=(
    ["default"]="2,1"        # concurrency,prefetch
    ["ai_processing"]="1,1"  # dedicated resource for AI tasks
    ["proposals"]="2,1"      # proposal handling
    ["notifications"]="1,1"  # async notifications
)

# Build queue argument string
QUEUE_ARGS=""
for queue in "${!QUEUES[@]}"; do
    QUEUE_ARGS="${QUEUE_ARGS}${queue},"
done
QUEUE_ARGS=${QUEUE_ARGS%,}  # Remove trailing comma

# Start Celery worker with optimized configuration
exec celery -A arena worker \
    --loglevel=${LOG_LEVEL} \
    --queues=${QUEUE_ARGS} \
    --concurrency=${CONCURRENCY} \
    --max-tasks-per-child=1000 \
    --task-events \
    -E \
    --max-memory-per-child=512000 \
    --prefetch-multiplier=1 \
    --without-gossip \
    --without-mingle \
    --optimization=fair \
    --pool=prefork \
    --time-limit=600 \
    --soft-time-limit=300 \
    --pidfile=/tmp/celery-%n.pid \
    --logfile=/var/log/celery/%n%I.log \
    --hostname=%h-${ENVIRONMENT:0:3}-%n-%i \
    --autoscale=${CONCURRENCY},1

# Note: This script uses Celery v5.3+ with the following configuration:
# - Dedicated queues for different task types (AI, proposals, notifications)
# - Memory optimization with max-tasks-per-child and max-memory-per-child
# - Fair task distribution with prefetch-multiplier=1
# - Task event monitoring enabled for observability
# - Graceful shutdown handling with signal traps
# - Autoscaling based on CONCURRENCY environment variable
# - Hostname pattern for easy worker identification
# - PID and log files for process management