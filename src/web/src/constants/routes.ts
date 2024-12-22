/**
 * @fileoverview Centralized route path constants for the Arena web application.
 * Defines all application routes and their nested structures for consistent routing.
 * @version 1.0.0
 */

/**
 * Authentication related routes including login, magic link, and OAuth flows
 */
export const AUTH = {
  /** Base authentication path */
  ROOT: '/auth',
  /** Login page path */
  LOGIN: '/auth/login',
  /** Magic link authentication path */
  MAGIC_LINK: '/auth/magic-link',
  /** Google OAuth callback path */
  GOOGLE_CALLBACK: '/auth/google/callback',
  /** Logout path */
  LOGOUT: '/auth/logout',
  /** Email verification path */
  VERIFY_EMAIL: '/auth/verify-email',
  /** Password reset path */
  RESET_PASSWORD: '/auth/reset-password',
} as const;

/**
 * Dashboard related routes for authenticated users
 */
export const DASHBOARD = {
  /** Base dashboard path */
  ROOT: '/dashboard',
  /** Dashboard home page */
  INDEX: '/dashboard',
  /** User profile page */
  PROFILE: '/dashboard/profile',
  /** User settings page */
  SETTINGS: '/dashboard/settings',
  /** Analytics dashboard */
  ANALYTICS: '/dashboard/analytics',
} as const;

/**
 * Request management related routes
 */
export const REQUESTS = {
  /** Base requests path */
  ROOT: '/requests',
  /** Requests list page */
  LIST: '/requests',
  /** Create new request page */
  CREATE: '/requests/create',
  /** Request details page with dynamic ID parameter */
  DETAILS: '/requests/:id',
  /** Edit request page with dynamic ID parameter */
  EDIT: '/requests/:id/edit',
  /** Review request page with dynamic ID parameter */
  REVIEW: '/requests/:id/review',
  /** Archive request page with dynamic ID parameter */
  ARCHIVE: '/requests/:id/archive',
} as const;

/**
 * Proposal management related routes
 */
export const PROPOSALS = {
  /** Base proposals path */
  ROOT: '/proposals',
  /** Proposals list page */
  LIST: '/proposals',
  /** Proposal details page with dynamic ID parameter */
  DETAILS: '/proposals/:id',
  /** Compare proposals page */
  COMPARE: '/proposals/compare',
  /** Accept proposal page with dynamic ID parameter */
  ACCEPT: '/proposals/:id/accept',
  /** Reject proposal page with dynamic ID parameter */
  REJECT: '/proposals/:id/reject',
  /** Proposal feedback page with dynamic ID parameter */
  FEEDBACK: '/proposals/:id/feedback',
} as const;

/**
 * Error and system status routes
 */
export const ERROR = {
  /** 404 Not Found error page */
  NOT_FOUND: '/404',
  /** 500 Server Error page */
  SERVER_ERROR: '/500',
  /** 403 Forbidden error page */
  FORBIDDEN: '/403',
  /** 401 Unauthorized error page */
  UNAUTHORIZED: '/401',
  /** System maintenance page */
  MAINTENANCE: '/maintenance',
} as const;

/**
 * Combined routes object containing all application routes
 */
export const ROUTES = {
  AUTH,
  DASHBOARD,
  REQUESTS,
  PROPOSALS,
  ERROR,
} as const;

/**
 * Helper type for route parameters
 */
export type RouteParams = {
  id?: string;
};

/**
 * Helper function to generate parameterized route paths
 * @param route Base route path containing parameter placeholders
 * @param params Object containing parameter values
 * @returns Resolved route path with actual parameter values
 */
export const generatePath = (route: string, params: RouteParams): string => {
  let path = route;
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value);
  });
  return path;
};

export default ROUTES;