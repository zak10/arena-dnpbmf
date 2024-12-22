#!/bin/bash

# Arena MVP Database Backup Script
# Version: 1.0.0
# Description: Creates and manages encrypted PostgreSQL database backups
# with compression, validation, and automated cleanup for both local and S3 storage.

# postgresql-client-14 # Version: 14+
# aws-cli # Version: 2.0+

# Enable strict error handling
set -euo pipefail
trap 'error_handler $? $LINENO $BASH_LINENO "$BASH_COMMAND" $(printf "::%s" ${FUNCNAME[@]:-})' ERR

# Source database connection parameters
# shellcheck source=init-db.sh
source "$(dirname "$0")/init-db.sh"

# Global variables with defaults
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
S3_BUCKET="${S3_BUCKET:-arena-backups}"
BACKUP_TYPE="${BACKUP_TYPE:-full}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_DIR="${LOG_DIR:-/var/log/arena/backups}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-9}"

# Error handler function
error_handler() {
    local exit_code=$1
    local line_no=$2
    local bash_lineno=$3
    local last_command=$4
    local error_trace=$5
    
    log_message "ERROR: Command '$last_command' failed with exit code $exit_code at line $line_no" "ERROR"
    log_message "Stack trace: $error_trace" "ERROR"
    
    # Cleanup any partial backups
    if [[ -n "${CURRENT_BACKUP_FILE:-}" ]]; then
        rm -f "$CURRENT_BACKUP_FILE"* || true
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
    mkdir -p "$LOG_DIR"
    
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_DIR/backup.log"
}

# Check all required dependencies and configurations
check_dependencies() {
    log_message "Checking dependencies..."
    
    # Check PostgreSQL client version
    if ! command -v pg_dump >/dev/null 2>&1; then
        log_message "PostgreSQL client not found" "ERROR"
        return 1
    fi
    
    local pg_version
    pg_version=$(pg_dump --version | grep -oE '[0-9]+' | head -1)
    if [[ "$pg_version" -lt 14 ]]; then
        log_message "PostgreSQL client version $pg_version is below minimum required version 14" "ERROR"
        return 1
    fi
    
    # Check AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        log_message "AWS CLI not found" "ERROR"
        return 1
    fi
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_message "Invalid AWS credentials" "ERROR"
        return 1
    }
    
    # Check backup directory
    mkdir -p "$BACKUP_DIR"
    if [[ ! -w "$BACKUP_DIR" ]]; then
        log_message "Backup directory $BACKUP_DIR is not writable" "ERROR"
        return 1
    fi
    
    # Check available disk space (minimum 5GB)
    local available_space
    available_space=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ "$available_space" -lt 5 ]]; then
        log_message "Insufficient disk space in $BACKUP_DIR" "ERROR"
        return 1
    fi
    
    # Verify database connection
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
        log_message "Database server is not ready" "ERROR"
        return 1
    fi
    
    return 0
}

# Create and validate database backup
create_backup() {
    local backup_type=$1
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${DB_NAME}_${backup_type}_${timestamp}.sql"
    CURRENT_BACKUP_FILE=$backup_file
    
    log_message "Creating $backup_type backup: $backup_file"
    
    # Create backup with progress monitoring
    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v \
        -F p \
        -f "$backup_file" 2>&1 | while read -r line; do
            log_message "$line" "DEBUG"
        done
    
    # Compress backup with specified level
    log_message "Compressing backup..."
    gzip -"$COMPRESSION_LEVEL" "$backup_file"
    backup_file="${backup_file}.gz"
    
    # Generate SHA256 checksum
    sha256sum "$backup_file" > "${backup_file}.sha256"
    
    # Verify backup integrity
    if ! gunzip -t "$backup_file" >/dev/null 2>&1; then
        log_message "Backup file verification failed" "ERROR"
        return 1
    fi
    
    local backup_size
    backup_size=$(du -h "$backup_file" | cut -f1)
    log_message "Backup completed successfully: $backup_size"
    
    echo "$backup_file"
}

# Upload backup to S3 with encryption
upload_to_s3() {
    local backup_file=$1
    local s3_path="backups/$(basename "$backup_file")"
    
    log_message "Uploading backup to S3: s3://$S3_BUCKET/$s3_path"
    
    # Upload backup with server-side encryption
    aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_path" \
        --storage-class STANDARD_IA \
        --server-side-encryption aws:kms \
        --metadata "retention=$RETENTION_DAYS" \
        --only-show-errors
    
    # Upload checksum file
    aws s3 cp "${backup_file}.sha256" "s3://$S3_BUCKET/${s3_path}.sha256" \
        --storage-class STANDARD_IA \
        --server-side-encryption aws:kms \
        --only-show-errors
    
    # Verify upload
    if ! aws s3api head-object --bucket "$S3_BUCKET" --key "$s3_path" >/dev/null 2>&1; then
        log_message "Failed to verify S3 upload" "ERROR"
        return 1
    fi
    
    log_message "Backup uploaded successfully to S3"
    return 0
}

# Clean up old backups
cleanup_old_backups() {
    local retention_days=$1
    local cutoff_date
    cutoff_date=$(date -d "$retention_days days ago" +%Y%m%d)
    local cleaned=0
    
    log_message "Cleaning up backups older than $retention_days days..."
    
    # Clean local backups
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +"$retention_days" -delete
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz.sha256" -type f -mtime +"$retention_days" -delete
    
    # Clean S3 backups
    aws s3api list-objects-v2 \
        --bucket "$S3_BUCKET" \
        --prefix "backups/${DB_NAME}_" \
        --query "Contents[?LastModified<='${cutoff_date}'].Key" \
        --output text | while read -r key; do
        if [[ -n "$key" ]]; then
            aws s3 rm "s3://$S3_BUCKET/$key"
            ((cleaned++))
        fi
    done
    
    log_message "Cleaned up $cleaned expired backups"
    return "$cleaned"
}

# Main function
main() {
    log_message "Starting database backup process..."
    
    # Initialize
    check_dependencies || exit 1
    
    # Create backup
    local backup_file
    backup_file=$(create_backup "$BACKUP_TYPE") || exit 1
    
    # Upload to S3
    upload_to_s3 "$backup_file" || exit 1
    
    # Cleanup
    cleanup_old_backups "$RETENTION_DAYS"
    
    log_message "Backup process completed successfully"
    return 0
}

# Execute main function
main "$@"