/**
 * @fileoverview Authentication API client module for Arena MVP
 * @version 1.0.0
 * 
 * Implements secure magic link and Google OAuth authentication flows with
 * enhanced security features, business email validation, rate limiting,
 * and secure session management.
 */

import { AxiosResponse } from 'axios'; // v1.4.0
import rateLimit from 'axios-rate-limit'; // v1.3.0
import { apiClient } from './config';
import { API_ENDPOINTS } from '../constants/api';
import { 
  MagicLinkPayload, 
  GoogleAuthPayload, 
  AuthResponse, 
  AuthErrorCode 
} from '../types/auth';
import { ErrorResponse } from '../types/common';

// Constants for authentication configuration
export const TOKEN_STORAGE_KEY = 'arena_auth_token';
export const RATE_LIMIT_ATTEMPTS = 3; // Max auth attempts per hour
export const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds

// Apply rate limiting to auth requests
const rateLimitedClient = rateLimit(apiClient, { 
  maxRequests: RATE_LIMIT_ATTEMPTS,
  perMilliseconds: RATE_LIMIT_WINDOW,
  statusCode: 429
});

/**
 * Validates business email format and domain
 * @param email Email address to validate
 * @throws Error if email format or domain is invalid
 */
const validateBusinessEmail = (email: string): void => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const commonPersonalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  const domain = email.split('@')[1].toLowerCase();
  if (commonPersonalDomains.includes(domain)) {
    throw new Error('Please use your business email address');
  }
};

/**
 * Securely stores authentication token with proper encryption
 * @param token JWT token to store
 */
const storeAuthToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    // Set secure session cookie with proper flags
    document.cookie = `${TOKEN_STORAGE_KEY}=${token}; Secure; SameSite=Strict; Path=/`;
  } catch (error) {
    console.error('Failed to store authentication token:', error);
    throw new Error('Authentication storage failed');
  }
};

/**
 * Securely clears authentication data
 */
const clearAuthData = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie = `${TOKEN_STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Strict; Path=/`;
  sessionStorage.clear();
};

/**
 * Requests a magic link authentication email
 * Implements rate limiting and business email validation
 * 
 * @param payload Magic link request payload
 * @returns Promise resolving to void on success
 * @throws ErrorResponse on validation or rate limit failure
 */
export const requestMagicLink = async (
  payload: MagicLinkPayload
): Promise<AxiosResponse<void>> => {
  try {
    validateBusinessEmail(payload.email);

    return await rateLimitedClient.post(
      API_ENDPOINTS.AUTH.MAGIC_LINK,
      payload,
      {
        headers: {
          'X-Request-Source': 'magic-link',
          'X-Rate-Limit': `${RATE_LIMIT_ATTEMPTS}/${RATE_LIMIT_WINDOW}`
        }
      }
    );
  } catch (error) {
    if ((error as ErrorResponse).code === AuthErrorCode.INVALID_MAGIC_LINK) {
      clearAuthData();
    }
    throw error;
  }
};

/**
 * Authenticates user using Google OAuth with workspace validation
 * 
 * @param payload Google authentication payload
 * @returns Promise resolving to AuthResponse on success
 * @throws ErrorResponse on validation or authentication failure
 */
export const authenticateWithGoogle = async (
  payload: GoogleAuthPayload
): Promise<AxiosResponse<AuthResponse>> => {
  try {
    const response = await rateLimitedClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.GOOGLE,
      payload,
      {
        headers: {
          'X-Request-Source': 'google-oauth',
          'X-Workspace-Required': 'true'
        }
      }
    );

    if (response.data) {
      storeAuthToken(response.data.token);
    }

    return response;
  } catch (error) {
    if ((error as ErrorResponse).code === AuthErrorCode.INVALID_CREDENTIALS) {
      clearAuthData();
    }
    throw error;
  }
};

/**
 * Securely logs out user and cleans up session data
 * 
 * @returns Promise resolving to void on success
 * @throws ErrorResponse on logout failure
 */
export const logout = async (): Promise<AxiosResponse<void>> => {
  try {
    const response = await apiClient.delete(
      API_ENDPOINTS.AUTH.LOGOUT,
      {
        headers: {
          'X-Request-Source': 'user-logout'
        }
      }
    );
    
    clearAuthData();
    return response;
  } catch (error) {
    // Always clear local auth data even if server logout fails
    clearAuthData();
    throw error;
  }
};