/**
 * @fileoverview Authentication type definitions for Arena MVP
 * @version 1.0.0
 */

/**
 * Enumeration of available user roles in the system
 * @enum {string}
 */
export enum UserRole {
  BUYER = 'BUYER',
  ARENA_STAFF = 'ARENA_STAFF'
}

/**
 * Type brand for ISO8601 datetime strings
 * Ensures type safety for datetime handling
 */
declare const ISO8601DateTimeBrand: unique symbol;
export type ISO8601DateTime = string & { readonly [ISO8601DateTimeBrand]: symbol };

/**
 * Type brand for business email addresses
 * Ensures type safety and validation for business emails
 */
declare const BusinessEmailBrand: unique symbol;
export type BusinessEmail = string & { readonly [BusinessEmailBrand]: symbol };

/**
 * Type brand for JWT tokens
 * Ensures type safety for authentication tokens
 */
declare const JWTTokenBrand: unique symbol;
export type JWTToken = string & { readonly [JWTTokenBrand]: symbol };

/**
 * Immutable interface defining core user data structure
 * @interface
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly company: string;
  readonly role: UserRole;
  readonly created_at: ISO8601DateTime;
}

/**
 * Interface for magic link authentication request payload
 * Requires validated business email
 * @interface
 */
export interface MagicLinkPayload {
  readonly email: BusinessEmail;
}

/**
 * Interface for Google OAuth authentication payload
 * Includes workspace validation flag
 * @interface
 */
export interface GoogleAuthPayload {
  readonly token: string;
  readonly workspace: boolean;
}

/**
 * Interface for successful authentication response
 * Includes user data, JWT token, and expiration
 * @interface
 */
export interface AuthResponse {
  readonly user: User;
  readonly token: JWTToken;
  readonly expires_at: ISO8601DateTime;
}

/**
 * Enumeration of authentication error codes
 * Maps to backend error responses
 * @enum {string}
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'E1001',
  EXPIRED_SESSION = 'E1002',
  INVALID_MAGIC_LINK = 'E1003'
}

/**
 * Type definition for authentication errors
 * Includes error code and message
 * @interface
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/**
 * Interface for authentication state in Redux store
 * Handles loading states and error conditions
 * @interface
 */
export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly user: User | null;
  readonly loading: boolean;
  readonly error: AuthError | null;
}