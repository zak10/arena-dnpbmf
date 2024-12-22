#!/bin/bash

# Arena MVP Database Initialization Script
# Version: 1.0.0
# Description: Initializes and configures PostgreSQL database with security measures,
# comprehensive error handling, and verification steps.

# Enable strict error handling
set -euo pipefail
trap 'error_handler $? $LINENO $BASH_LINENO "$BASH_COMMAND" $(printf "::%s" ${FUNCNAME[@]:-})' ERR

# Global variables
readonly DB_NAME=${DB_NAME:-"arena_dev"}
readonly DB_USER=${DB_USER:-"arena_user"}
readonly DB_PASSWORD=${ARENA_DB_PASSWORD:-""}
readonly DB_HOST=${DB_HOST:-"localhost"}
readonly DB_PORT=${DB_PORT:-"5432"}
readonly LOG_FILE=${LOG_FILE:-"/var/log/arena/db-init.log"}
readonly BACKUP_DIR=${BACKUP_DIR:-"/var/backups/arena"}
readonly MAX_CONNECTIONS=${MAX_CONNECTIONS:-"100"}
readonly STATEMENT_TIMEOUT=${STATEMENT_TIMEOUT:-"30000"}

# Error handler function
error_handler() {
    local exit_code=$1
    local line_no=$2
    local bash_lineno=$3
    local last_command=$4
    local error_trace=$5
    
    log_message "ERROR: Command '$last_command' failed with exit code $exit_code at line $line_no" "ERROR"
    log_message "Stack trace: $error_trace" "ERROR"
    
    # Cleanup on error
    if psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_message "Rolling back database changes..." "WARN"
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U postgres "$DB_NAME" || true
    fi
    
    exit "$exit_code"
}

# Logging function
log_message() {
    local message=$1
    local level=${2:-"INFO"}
    local timestamp
    timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log_message "Checking prerequisites..."
    
    # Check PostgreSQL client
    if ! command -v psql >/dev/null 2>&1; then
        log_message "PostgreSQL client not found" "ERROR"
        return 1
    fi
    
    # Check required environment variables
    if [[ -z "$DB_PASSWORD" ]]; then
        log_message "ARENA_DB_PASSWORD environment variable not set" "ERROR"
        return 1
    fi
    
    # Check backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Check PostgreSQL connection
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT"; then
        log_message "PostgreSQL server is not ready" "ERROR"
        return 1
    fi
    
    return 0
}

# Check PostgreSQL server
check_postgres() {
    log_message "Checking PostgreSQL server..."
    
    local pg_version
    pg_version=$(psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -t -c "SHOW server_version;" | xargs)
    
    if [[ "${pg_version%%.*}" -lt 14 ]]; then
        log_message "PostgreSQL version $pg_version is below minimum required version 14" "ERROR"
        return 1
    fi
    
    log_message "PostgreSQL version $pg_version verified"
    return 0
}

# Create database with security configuration
create_database() {
    log_message "Creating database $DB_NAME..."
    
    # Create user with secure password
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres <<-EOSQL
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
                CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD' LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
            END IF;
        END
        \$\$;
EOSQL
    
    # Create database with secure defaults
    createdb -h "$DB_HOST" -p "$DB_PORT" -U postgres \
        -O "$DB_USER" \
        -E UTF8 \
        -T template0 \
        --lc-collate="en_US.UTF-8" \
        --lc-ctype="en_US.UTF-8" \
        "$DB_NAME"
    
    # Configure database parameters
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" <<-EOSQL
        ALTER DATABASE $DB_NAME SET statement_timeout = '$STATEMENT_TIMEOUT';
        ALTER DATABASE $DB_NAME SET idle_in_transaction_session_timeout = '3600000';
        ALTER DATABASE $DB_NAME SET default_transaction_isolation TO 'read committed';
        ALTER DATABASE $DB_NAME SET timezone TO 'UTC';
        
        -- Enable required extensions
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
        
        -- Configure connection limits
        ALTER DATABASE $DB_NAME CONNECTION LIMIT $MAX_CONNECTIONS;
EOSQL
    
    log_message "Database $DB_NAME created successfully"
}

# Setup secure permissions
setup_permissions() {
    log_message "Setting up database permissions..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" <<-EOSQL
        -- Revoke public schema access
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
        REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
        
        -- Grant specific permissions to application user
        GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;
        GRANT USAGE ON SCHEMA public TO $DB_USER;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DB_USER;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO $DB_USER;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO $DB_USER;
        
        -- Setup audit logging
        CREATE SCHEMA IF NOT EXISTS audit;
        GRANT USAGE ON SCHEMA audit TO $DB_USER;
        CREATE TABLE IF NOT EXISTS audit.logs (
            id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
            table_name text NOT NULL,
            action text NOT NULL,
            old_data jsonb,
            new_data jsonb,
            changed_by text NOT NULL,
            changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
        );
EOSQL
    
    log_message "Database permissions configured successfully"
}

# Run Django migrations
run_migrations() {
    log_message "Running database migrations..."
    
    # Create migrations backup
    local backup_file="$BACKUP_DIR/migrations_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -f "$backup_file"
    
    # Run migrations
    cd /app/backend || exit 1
    python manage.py migrate --noinput
    
    log_message "Database migrations completed successfully"
}

# Create optimized indexes
create_indexes() {
    log_message "Creating database indexes..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" <<-EOSQL
        -- Create indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests_request(user_id);
        CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests_request(status);
        CREATE INDEX IF NOT EXISTS idx_proposals_request_id ON public.proposals_proposal(request_id);
        CREATE INDEX IF NOT EXISTS idx_proposals_vendor_id ON public.proposals_proposal(vendor_id);
        
        -- Create GiST index for full text search
        CREATE INDEX IF NOT EXISTS idx_requests_requirements_search 
        ON public.requests_request 
        USING gin(to_tsvector('english', requirements_text));
EOSQL
    
    log_message "Database indexes created successfully"
}

# Verify database setup
verify_setup() {
    log_message "Verifying database setup..."
    
    # Test database connection
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log_message "Database connection verification failed" "ERROR"
        return 1
    fi
    
    # Verify extensions
    local required_extensions=("uuid-ossp" "pgcrypto" "pg_stat_statements")
    for ext in "${required_extensions[@]}"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -t -c "SELECT 1 FROM pg_extension WHERE extname = '$ext';" | grep -q 1; then
            log_message "Required extension $ext is not installed" "ERROR"
            return 1
        fi
    done
    
    log_message "Database setup verified successfully"
    return 0
}

# Main execution
main() {
    log_message "Starting database initialization..."
    
    check_prerequisites || exit 1
    check_postgres || exit 1
    create_database
    setup_permissions
    run_migrations
    create_indexes
    verify_setup
    
    log_message "Database initialization completed successfully"
}

main "$@"