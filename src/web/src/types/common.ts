/**
 * @fileoverview Core TypeScript type definitions and interfaces for Arena MVP frontend
 * @version 1.0.0
 */

/**
 * Generic wrapper for API responses with proper typing and request tracking
 */
export interface ApiResponse<T> {
  readonly data: T;
  readonly error: ErrorResponse | null;
  readonly timestamp: string;
  readonly requestId: string;
}

/**
 * Standardized error response structure with severity levels
 */
export interface ErrorResponse {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly severity: ErrorSeverity;
}

/**
 * Generic wrapper for paginated API responses with enhanced metadata
 */
export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
  readonly totalPages: number;
}

/**
 * Enhanced file upload interface with security classification
 */
export interface FileUpload {
  readonly id: string;
  readonly name: string;
  readonly fileType: AllowedFileType;
  readonly sizeBytes: number;
  readonly uploadedAt: string;
  readonly securityClassification: DataClassification;
}

/**
 * Extended loading state type with retry support
 */
export type LoadingState = 
  | 'IDLE'
  | 'LOADING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RETRYING';

/**
 * Type for sort direction options
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * Enumerated error codes from A.5 Error Codes section
 */
export type ErrorCode =
  | 'E1001' // Authentication - Invalid credentials
  | 'E1002' // Authentication - Expired session
  | 'E1003' // Authentication - Invalid magic link
  | 'E2001' // Request - Invalid request format
  | 'E2002' // Request - Missing required fields
  | 'E2003' // Request - File upload failed
  | 'E3001' // Proposal - Invalid proposal status
  | 'E3002' // Proposal - Duplicate submission
  | 'E3003' // Proposal - Missing required information
  | 'E4001' // System - AI processing failed
  | 'E4002' // System - Database connection error
  | 'E4003'; // System - External service unavailable

/**
 * Error severity levels for error handling
 */
export type ErrorSeverity =
  | 'INFO'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL';

/**
 * Data classification levels from security specifications
 */
export type DataClassification =
  | 'PUBLIC'
  | 'SENSITIVE'
  | 'HIGHLY_SENSITIVE';

/**
 * Enumerated allowed file types for upload
 */
export type AllowedFileType =
  | 'PDF'
  | 'DOC'
  | 'DOCX'
  | 'XLS'
  | 'XLSX';

/**
 * Global constants for pagination, file uploads, and retries
 */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const MAX_FILE_SIZE_BYTES = 10485760; // 10MB
export const ALLOWED_FILE_TYPES: readonly AllowedFileType[] = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX'];
export const MAX_RETRY_ATTEMPTS = 3;