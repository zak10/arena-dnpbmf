#!/bin/bash

# Arena MVP Database Restore Script
# Version: 1.0.0
# Description: Secure database restoration script with encryption verification,
# integrity checks, and comprehensive error handling.

# Enable strict error handling
set -euo pipefail
IFS=$'\n\t'

# Source database configuration with validation
# shellcheck source=./init-db.sh
source "$(dirname "$0")/init-db.sh"

# Global variables with defaults
readonly BACKUP_DIR=${BACKUP_DIR:-/var/backups/postgresql}
readonly S3_BUCKET=${S3_BUCKET:-arena-backups}
readonly RESTORE_POINT=${RESTORE_POINT:-latest}
readonly TEMP_DIR=${TEMP_DIR:-/tmp/arena-restore}
readonly LOG_DIR=${LOG_DIR:-/var/log/arena}
readonly ENCRYPTION_KEY=${ENCRYPTION_KEY:-}
readonly MAX_PARALLEL_JOBS=${MAX_PARALLEL_JOBS:-4}
readonly CHECKSUM_ALGORITHM="sha256"

# Initialize logging
log_file="${LOG_DIR}/restore-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$(dirname "$log_file")"
exec 1> >(tee -a "${log_file}")
exec 2>&1

# Logging function
log_message() {
    local level=$1
    local message=$2
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] [${level}] ${message}"
}

# Error handler
error_handler() {
    local exit_code=$1
    local line_no=$2
    
    log_message "ERROR" "Command failed at line ${line_no} with exit code ${exit_code}"
    cleanup
    exit "${exit_code}"
}

trap 'error_handler $? $LINENO' ERR

# Comprehensive dependency check
check_dependencies() {
    log_message "INFO" "Checking dependencies..."
    
    # Check required tools
    local required_tools=("pg_restore" "aws" "openssl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "${tool}" >/dev/null 2>&1; then
            log_message "ERROR" "Required tool not found: ${tool}"
            return 1
        fi
    done
    
    # Verify PostgreSQL version compatibility
    local pg_version
    pg_version=$(pg_restore --version | grep -oE '[0-9]+' | head -1)
    if [[ ${pg_version} -lt 14 ]]; then
        log_message "ERROR" "PostgreSQL version must be 14 or higher"
        return 1
    fi
    
    # Check AWS credentials if using S3
    if [[ ${RESTORE_POINT} == s3://* ]]; then
        if ! aws sts get-caller-identity >/dev/null 2>&1; then
            log_message "ERROR" "Invalid AWS credentials"
            return 1
        fi
    fi
    
    # Verify directory permissions
    for dir in "${BACKUP_DIR}" "${TEMP_DIR}" "${LOG_DIR}"; do
        mkdir -p "${dir}"
        chmod 700 "${dir}"
    done
    
    # Verify encryption key if provided
    if [[ -n ${ENCRYPTION_KEY} ]]; then
        if ! [[ ${ENCRYPTION_KEY} =~ ^[A-Fa-f0-9]{64}$ ]]; then
            log_message "ERROR" "Invalid encryption key format"
            return 1
        fi
    fi
    
    return 0
}

# Fetch and validate backup
fetch_backup() {
    local restore_point=$1
    local backup_file
    
    log_message "INFO" "Fetching backup: ${restore_point}"
    
    # Create secure temporary directory
    rm -rf "${TEMP_DIR}"
    mkdir -p "${TEMP_DIR}"
    chmod 700 "${TEMP_DIR}"
    
    # Handle 'latest' restore point
    if [[ ${restore_point} == "latest" ]]; then
        if [[ -d ${BACKUP_DIR} ]]; then
            restore_point=$(find "${BACKUP_DIR}" -name "*.backup" -type f -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
        else
            restore_point=$(aws s3 ls "${S3_BUCKET}/backups/" | sort | tail -n 1 | awk '{print $4}')
        fi
    fi
    
    # Download or copy backup
    if [[ ${restore_point} == s3://* ]]; then
        backup_file="${TEMP_DIR}/$(basename "${restore_point}")"
        aws s3 cp \
            --sse AES256 \
            "${restore_point}" \
            "${backup_file}"
    else
        backup_file="${TEMP_DIR}/$(basename "${restore_point}")"
        cp "${restore_point}" "${backup_file}"
    fi
    
    # Verify backup file
    if ! verify_backup "${backup_file}"; then
        log_message "ERROR" "Backup verification failed"
        return 1
    fi
    
    echo "${backup_file}"
}

# Verify backup integrity and encryption
verify_backup() {
    local backup_file=$1
    
    log_message "INFO" "Verifying backup: ${backup_file}"
    
    # Check file existence and permissions
    if [[ ! -f ${backup_file} ]]; then
        log_message "ERROR" "Backup file not found"
        return 1
    fi
    
    # Verify file permissions
    if [[ $(stat -c "%a" "${backup_file}") != "600" ]]; then
        chmod 600 "${backup_file}"
    fi
    
    # Verify encryption if enabled
    if [[ -n ${ENCRYPTION_KEY} ]]; then
        if ! openssl enc -d -aes-256-cbc -k "${ENCRYPTION_KEY}" -in "${backup_file}" -out /dev/null 2>/dev/null; then
            log_message "ERROR" "Backup encryption verification failed"
            return 1
        fi
    fi
    
    # Verify checksum
    local stored_checksum
    local calculated_checksum
    
    stored_checksum=$(head -n 1 "${backup_file}.sha256" 2>/dev/null || echo "")
    calculated_checksum=$(sha256sum "${backup_file}" | cut -d' ' -f1)
    
    if [[ -n ${stored_checksum} ]] && [[ ${stored_checksum} != "${calculated_checksum}" ]]; then
        log_message "ERROR" "Backup checksum verification failed"
        return 1
    fi
    
    return 0
}

# Restore database with validation
restore_database() {
    local backup_file=$1
    
    log_message "INFO" "Starting database restore from ${backup_file}"
    
    # Create clean database if not exists
    if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
        createdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}"
    fi
    
    # Terminate existing connections
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres <<-EOF
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '${DB_NAME}' 
        AND pid <> pg_backend_pid();
EOF
    
    # Restore with progress monitoring
    pg_restore \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --username="${DB_USER}" \
        --dbname="${DB_NAME}" \
        --jobs="${MAX_PARALLEL_JOBS}" \
        --verbose \
        --clean \
        --if-exists \
        --exit-on-error \
        "${backup_file}"
    
    # Verify restore
    if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" >/dev/null 2>&1; then
        log_message "ERROR" "Database restore verification failed"
        return 1
    fi
    
    return 0
}

# Secure cleanup
cleanup() {
    log_message "INFO" "Performing cleanup..."
    
    # Securely remove temporary files
    if [[ -d ${TEMP_DIR} ]]; then
        find "${TEMP_DIR}" -type f -exec shred -u {} \;
        rm -rf "${TEMP_DIR}"
    fi
    
    # Clear sensitive environment variables
    unset ENCRYPTION_KEY DB_PASSWORD
    
    return 0
}

# Main execution
main() {
    local backup_file
    
    log_message "INFO" "Starting database restore process"
    
    # Validate dependencies and environment
    check_dependencies || exit 1
    
    # Fetch and verify backup
    backup_file=$(fetch_backup "${RESTORE_POINT}")
    
    # Perform restore
    if restore_database "${backup_file}"; then
        log_message "INFO" "Database restore completed successfully"
    else
        log_message "ERROR" "Database restore failed"
        exit 1
    fi
    
    # Cleanup
    cleanup
    
    return 0
}

# Execute main function
main "$@"