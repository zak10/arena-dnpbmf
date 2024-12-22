/**
 * @fileoverview Core TypeScript type definitions for API request/response handling
 * @version 1.0.0
 */

import { User } from '../types/auth';
import { Request } from '../types/requests';
import { ApiResponse, ErrorResponse, ErrorSeverity } from '../types/common';

/**
 * HTTP methods supported by the API
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Global API configuration constants
 */
export const API_VERSION = 'v1';
export const API_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const RATE_LIMIT_REQUESTS = 100;
export const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Default security headers based on A.1.3 Security Headers Configuration
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' *.google-analytics.com; img-src 'self' data: *.amazonaws.com",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff'
};

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly errorCode: string;
}

/**
 * Retry policy configuration interface
 */
export interface RetryConfig {
  readonly maxAttempts: number;
  readonly backoffMs: number;
  readonly retryableErrors: string[];
}

/**
 * Enhanced API configuration interface
 */
export interface ApiConfig {
  readonly baseUrl: string;
  readonly version: string;
  readonly timeout: number;
  readonly rateLimit: RateLimitConfig;
  readonly retryPolicy: RetryConfig;
}

/**
 * Enhanced security context for requests
 */
export interface SecurityContext {
  readonly authToken?: string;
  readonly dataClassification: 'PUBLIC' | 'SENSITIVE' | 'HIGHLY_SENSITIVE';
  readonly encryptionRequired: boolean;
}

/**
 * Request metadata for tracking and debugging
 */
export interface RequestMetadata {
  readonly requestId: string;
  readonly timestamp: number;
  readonly source: string;
  readonly correlationId?: string;
}

/**
 * Validation rules for request data
 */
export interface ValidationRules {
  readonly required?: string[];
  readonly maxLength?: Record<string, number>;
  readonly pattern?: Record<string, RegExp>;
}

/**
 * Enhanced API headers interface with security headers
 */
export interface ApiHeaders {
  readonly Authorization?: string;
  readonly 'Content-Type': string;
  readonly Accept: string;
  readonly 'X-Request-ID': string;
  readonly 'X-API-Version': string;
  readonly 'Strict-Transport-Security': string;
  readonly 'Content-Security-Policy': string;
  readonly 'X-Frame-Options'?: string;
  readonly 'X-Content-Type-Options'?: string;
}

/**
 * Enhanced API request configuration interface
 */
export interface ApiRequestConfig<T = unknown> {
  readonly method: ApiMethod;
  readonly url: string;
  readonly headers: ApiHeaders;
  readonly data?: T;
  readonly params?: Record<string, string>;
  readonly metadata: RequestMetadata;
  readonly securityContext: SecurityContext;
  readonly validationRules?: ValidationRules;
}

/**
 * Enhanced error response interface with severity levels
 */
export interface ErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly severity: ErrorSeverity;
  readonly details: Record<string, unknown>;
  readonly stack?: string;
  readonly timestamp: number;
  readonly requestId: string;
}

/**
 * Type guard to check if response contains error
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    'message' in response &&
    'severity' in response
  );
}

/**
 * Generic success response type
 */
export type SuccessResponse<T> = {
  readonly data: T;
  readonly metadata: {
    readonly timestamp: number;
    readonly requestId: string;
  };
};

/**
 * Generic paginated response type
 */
export type PaginatedResponse<T> = {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
};

/**
 * Type aliases for common response types
 */
export type UserResponse = ApiResponse<User>;
export type RequestResponse = ApiResponse<Request>;
export type RequestListResponse = ApiResponse<PaginatedResponse<Request>>;