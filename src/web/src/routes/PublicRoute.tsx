/**
 * @fileoverview Public route wrapper component for authentication-based access control
 * @version 1.0.0
 * 
 * Implements route protection for public authentication flows including magic link
 * and Google OAuth with proper session validation and security checks.
 */

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';
import AuthLayout from '../layouts/AuthLayout';

/**
 * Props interface for the PublicRoute component with strict typing
 */
interface PublicRouteProps {
  /** Child components to be rendered within the public route wrapper */
  children: React.ReactNode;
  /** Optional title for the auth page */
  title?: string;
  /** Optional theme override */
  theme?: 'light' | 'dark';
}

/**
 * Higher-order component that handles public route access control with proper
 * authentication checks and redirection logic.
 * 
 * Ensures public routes (login, magic link, etc.) are only accessible when logged out
 * and redirects authenticated users to the dashboard.
 *
 * @component
 * @example
 * ```tsx
 * <PublicRoute>
 *   <LoginForm />
 * </PublicRoute>
 * ```
 */
const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  title,
  theme = 'light'
}) => {
  // Get authentication state from auth hook
  const { isAuthenticated } = useAuth();

  // Effect for cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup any auth-related side effects
      document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    };
  }, []);

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD.ROOT} replace />;
  }

  // Render public route content wrapped in AuthLayout
  return (
    <AuthLayout 
      title={title}
      theme={theme}
      ariaLabel="Authentication page"
    >
      {children}
    </AuthLayout>
  );
};

// Add display name for debugging
PublicRoute.displayName = 'PublicRoute';

// Export strictly typed public route protection component
export default PublicRoute;