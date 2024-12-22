/**
 * @fileoverview Core API configuration and setup for Arena MVP frontend
 * @version 1.0.0
 * 
 * Implements secure API client with comprehensive security, monitoring,
 * and error handling based on technical specifications.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // v1.4.0
import { v4 as uuid } from 'uuid'; // v4.5.0
import { API_ENDPOINTS } from '../constants/api';
import { ApiConfig } from './types';
import { parseApiError } from '../utils/error';
import { ErrorResponse, ErrorSeverity } from '../types/common';

/**
 * Default API configuration based on technical specifications
 */
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: process.env.REACT_APP_API_URL || '/api',
  version: 'v1',
  timeout: 30000,
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000,
    errorCode: 'E4002'
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffMs: 1000,
    retryableErrors: ['E4001', 'E4002', 'E4003']
  }
};

/**
 * Security headers based on A.1.3 Security Headers Configuration
 */
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' *.google-analytics.com; img-src 'self' data: *.amazonaws.com",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block'
};

/**
 * Creates and configures an Axios instance with comprehensive security and monitoring
 */
function createApiClient(config: ApiConfig = DEFAULT_CONFIG): AxiosInstance {
  const client = axios.create({
    baseURL: `${config.baseUrl}/${config.version}`,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Api-Version': config.version,
      ...SECURITY_HEADERS
    },
    validateStatus: (status) => status >= 200 && status < 300,
    withCredentials: true, // Enable CSRF protection
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN'
  });

  setupInterceptors(client, config);
  return client;
}

/**
 * Configures request and response interceptors for security, monitoring and error handling
 */
function setupInterceptors(client: AxiosInstance, config: ApiConfig): void {
  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add correlation ID for request tracking
      const requestId = uuid();
      config.headers['X-Request-ID'] = requestId;
      config.headers['X-Client-Version'] = process.env.REACT_APP_VERSION;

      // Add authentication token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      // Log request if debugging enabled
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          requestId,
          timestamp: new Date().toISOString()
        });
      }

      return config;
    },
    (error) => {
      return Promise.reject(parseApiError(error));
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log response if debugging enabled
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[API] Response ${response.status}`, {
          requestId: response.config.headers['X-Request-ID'],
          timestamp: new Date().toISOString()
        });
      }

      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      const parsedError = parseApiError(error);

      // Implement retry logic for specific error codes
      if (
        config.retryPolicy.retryableErrors.includes(parsedError.code) &&
        (!originalRequest._retry || originalRequest._retry < config.retryPolicy.maxAttempts)
      ) {
        originalRequest._retry = (originalRequest._retry || 0) + 1;
        const backoffTime = config.retryPolicy.backoffMs * originalRequest._retry;

        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return client(originalRequest);
      }

      // Handle authentication errors
      if (parsedError.code === 'E1001' || parsedError.code === 'E1002') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }

      return Promise.reject(parsedError);
    }
  );
}

// Create and export the configured API client
export const apiClient = createApiClient();

/**
 * Type-safe API request wrapper with error handling
 */
export async function makeRequest<T>(
  config: AxiosRequestConfig,
  errorSeverity: ErrorSeverity = 'ERROR'
): Promise<T> {
  try {
    const response = await apiClient.request<T>(config);
    return response.data;
  } catch (error) {
    throw parseApiError(error, errorSeverity);
  }
}

/**
 * Utility functions for common API operations
 */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    makeRequest<T>({ ...config, method: 'GET', url }),
    
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    makeRequest<T>({ ...config, method: 'POST', url, data }),
    
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    makeRequest<T>({ ...config, method: 'PUT', url, data }),
    
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    makeRequest<T>({ ...config, method: 'DELETE', url })
};

export default apiClient;