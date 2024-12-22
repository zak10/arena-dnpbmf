// @ts-check
/**
 * API Constants and Configuration
 * Version: 1.0.0
 * 
 * Core API endpoint and configuration constants for the Arena MVP frontend application.
 * Provides type-safe access to API routes, rate limits, and configuration values.
 */

/**
 * Base API URL from environment or default to /api/v1
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

/**
 * API request timeout in milliseconds
 */
export const API_TIMEOUT = 30000;

/**
 * Number of API request retry attempts
 */
export const API_RETRY_ATTEMPTS = 3;

/**
 * API version constants
 */
export const API_VERSIONS = {
  V1: 'v1'
} as const;

/**
 * API rate limit constants (requests per minute)
 */
export const API_RATE_LIMITS = {
  DEFAULT: 100, // Standard rate limit per user
  AUTH: 3 // Auth attempts per hour
} as const;

/**
 * Type-safe API endpoint path constants
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    MAGIC_LINK: '/auth/magic-link',
    GOOGLE: '/auth/google',
    LOGOUT: '/auth/logout'
  },
  REQUESTS: {
    BASE: '/requests',
    DETAIL: '/requests/:id',
    REQUIREMENTS: '/requests/:id/requirements',
    PROPOSALS: '/requests/:id/proposals'
  },
  PROPOSALS: {
    BASE: '/proposals',
    DETAIL: '/proposals/:id',
    ACCEPT: '/proposals/:id/accept',
    REJECT: '/proposals/:id/reject'
  },
  VENDORS: {
    BASE: '/vendors',
    DETAIL: '/vendors/:id'
  }
} as const;

/**
 * Type for path parameters in API endpoints
 */
type PathParams = Record<string, string>;

/**
 * Error messages for URL building
 */
const URL_BUILD_ERRORS = {
  INVALID_ENDPOINT: 'Invalid API endpoint path',
  MISSING_PARAMS: 'Missing required path parameters',
  INVALID_URL: 'Invalid URL format'
} as const;

/**
 * Builds a complete API endpoint URL with path parameters
 * 
 * @param endpoint - The API endpoint path from API_ENDPOINTS
 * @param params - Object containing path parameters to replace
 * @returns Complete API endpoint URL with replaced path parameters
 * @throws Error if endpoint is invalid or parameters are missing
 * 
 * @example
 * ```typescript
 * const url = buildEndpointUrl(API_ENDPOINTS.REQUESTS.DETAIL, { id: '123' });
 * // Returns: '/api/v1/requests/123'
 * ```
 */
export const buildEndpointUrl = (endpoint: string, params: PathParams = {}): string => {
  // Validate endpoint exists in API_ENDPOINTS
  const isValidEndpoint = Object.values(API_ENDPOINTS)
    .some(group => Object.values(group)
      .includes(endpoint));

  if (!isValidEndpoint) {
    throw new Error(URL_BUILD_ERRORS.INVALID_ENDPOINT);
  }

  // Find all required path parameters
  const requiredParams = endpoint.match(/:[a-zA-Z]+/g) || [];

  // Validate all required parameters are provided
  const missingParams = requiredParams.some(param => {
    const paramName = param.slice(1); // Remove : prefix
    return !params[paramName];
  });

  if (missingParams) {
    throw new Error(URL_BUILD_ERRORS.MISSING_PARAMS);
  }

  // Replace path parameters with provided values
  let url = endpoint;
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  });

  // Validate resulting URL format
  const urlRegex = /^\/[a-zA-Z0-9\-\/]+$/;
  if (!urlRegex.test(url)) {
    throw new Error(URL_BUILD_ERRORS.INVALID_URL);
  }

  // Return complete URL with API_BASE_URL prefix
  return `${API_BASE_URL}${url}`;
};