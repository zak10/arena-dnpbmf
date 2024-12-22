/**
 * @fileoverview Error handling utilities for Arena MVP frontend
 * @version 1.0.0
 * Implements secure error handling with sanitization, severity levels, and standardized formatting
 */

import { AxiosError } from 'axios'; // v1.4.0
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import { ErrorResponse, ErrorCode, ErrorSeverity } from '../types/common';

// Default error message for unexpected errors
export const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';

// Standard error codes mapping based on A.5 Error Codes specification
export const ERROR_CODES = {
  BAD_REQUEST: 'E2001' as ErrorCode,
  UNAUTHORIZED: 'E1001' as ErrorCode,
  FORBIDDEN: 'E1002' as ErrorCode,
  NOT_FOUND: 'E2002' as ErrorCode,
  RATE_LIMITED: 'E4002' as ErrorCode,
  SERVER_ERROR: 'E4001' as ErrorCode,
  NETWORK_ERROR: 'E4003' as ErrorCode,
  VALIDATION_ERROR: 'E2003' as ErrorCode,
} as const;

// Error severity levels
export const ERROR_SEVERITIES = {
  INFO: 'INFO' as ErrorSeverity,
  WARNING: 'WARNING' as ErrorSeverity,
  ERROR: 'ERROR' as ErrorSeverity,
  CRITICAL: 'CRITICAL' as ErrorSeverity,
} as const;

// Sanitization options for error messages
const sanitizeOptions = {
  allowedTags: [], // Strip all HTML tags
  allowedAttributes: {}, // Strip all attributes
  textFilter: (text: string) => {
    // Remove potential sensitive data patterns
    return text
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]') // Email addresses
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]') // Credit card numbers
      .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[SSN]') // Social security numbers
      .replace(/\b(?:\+\d{1,2}\s?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b/g, '[PHONE]'); // Phone numbers
  }
};

/**
 * Type guard to check if an error matches the ErrorResponse interface
 * Includes validation of required properties and formats
 */
export function isApiError(error: unknown): error is ErrorResponse {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const potentialError = error as Partial<ErrorResponse>;
  
  return (
    typeof potentialError.code === 'string' &&
    typeof potentialError.message === 'string' &&
    typeof potentialError.details === 'object' &&
    typeof potentialError.severity === 'string' &&
    Object.values(ERROR_CODES).includes(potentialError.code as ErrorCode) &&
    Object.values(ERROR_SEVERITIES).includes(potentialError.severity as ErrorSeverity)
  );
}

/**
 * Type guard to identify network-related errors
 */
export function isNetworkError(error: unknown): error is AxiosError {
  return (
    error instanceof Error &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Maps HTTP status codes to appropriate error codes and severities
 */
function mapHttpErrorCode(status: number): { code: ErrorCode; severity: ErrorSeverity } {
  switch (status) {
    case 400:
      return { code: ERROR_CODES.BAD_REQUEST, severity: ERROR_SEVERITIES.WARNING };
    case 401:
      return { code: ERROR_CODES.UNAUTHORIZED, severity: ERROR_SEVERITIES.ERROR };
    case 403:
      return { code: ERROR_CODES.FORBIDDEN, severity: ERROR_SEVERITIES.ERROR };
    case 404:
      return { code: ERROR_CODES.NOT_FOUND, severity: ERROR_SEVERITIES.WARNING };
    case 429:
      return { code: ERROR_CODES.RATE_LIMITED, severity: ERROR_SEVERITIES.WARNING };
    default:
      return { code: ERROR_CODES.SERVER_ERROR, severity: ERROR_SEVERITIES.CRITICAL };
  }
}

/**
 * Parses and sanitizes any error into a standardized ErrorResponse format
 * Implements security considerations for sensitive data
 */
export function parseApiError(
  error: unknown,
  defaultSeverity: ErrorSeverity = ERROR_SEVERITIES.ERROR
): ErrorResponse {
  // If error is already in correct format, just sanitize the message
  if (isApiError(error)) {
    return {
      ...error,
      message: sanitizeHtml(error.message, sanitizeOptions),
      details: sanitizeErrorDetails(error.details)
    };
  }

  // Handle Axios errors
  if (isNetworkError(error)) {
    const { code, severity } = mapHttpErrorCode(error.response?.status || 500);
    return {
      code,
      severity,
      message: sanitizeHtml(error.response?.data?.message || error.message, sanitizeOptions),
      details: sanitizeErrorDetails(error.response?.data || {})
    };
  }

  // Handle unknown errors
  return {
    code: ERROR_CODES.SERVER_ERROR,
    severity: defaultSeverity,
    message: sanitizeHtml(
      error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
      sanitizeOptions
    ),
    details: {}
  };
}

/**
 * Formats error messages for user display with security and severity considerations
 */
export function formatErrorMessage(error: ErrorResponse): string {
  const prefix = error.severity === ERROR_SEVERITIES.CRITICAL ? '🚨 ' : 
                 error.severity === ERROR_SEVERITIES.ERROR ? '❌ ' :
                 error.severity === ERROR_SEVERITIES.WARNING ? '⚠️ ' : 'ℹ️ ';

  const sanitizedMessage = sanitizeHtml(error.message, sanitizeOptions);
  
  return `${prefix}${sanitizedMessage}${
    error.severity === ERROR_SEVERITIES.CRITICAL
      ? ' Please contact support if this issue persists.'
      : ''
  }`;
}

/**
 * Sanitizes error details object to remove sensitive information
 */
function sanitizeErrorDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitizedDetails: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    // Skip sensitive keys
    if (['password', 'token', 'key', 'secret', 'credential'].includes(key.toLowerCase())) {
      continue;
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object') {
      sanitizedDetails[key] = sanitizeErrorDetails(value as Record<string, unknown>);
    } 
    // Sanitize string values
    else if (typeof value === 'string') {
      sanitizedDetails[key] = sanitizeHtml(value, sanitizeOptions);
    }
    // Keep other primitive values as is
    else {
      sanitizedDetails[key] = value;
    }
  }

  return sanitizedDetails;
}