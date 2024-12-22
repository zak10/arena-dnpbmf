import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom'; // v6.4.0
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../layouts/DashboardLayout';
import Loading from '../components/common/Loading';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { ROUTES } from '../constants/routes';

/**
 * Props interface for the PrivateRoute component
 */
interface PrivateRouteProps {
  /** Required user roles for accessing the route */
  requiredRoles?: string[];
}

/**
 * Validates current session status and expiry
 * @param sessionExpiry - Session expiration timestamp
 * @returns Boolean indicating if session is valid
 */
const validateSession = (sessionExpiry: Date | null): boolean => {
  if (!sessionExpiry) return false;
  return new Date() < new Date(sessionExpiry);
};

/**
 * Validates user role against required permissions
 * @param userRole - Current user's role
 * @param requiredRoles - Array of allowed roles
 * @returns Boolean indicating if user has required role
 */
const validateAccess = (userRole: string | undefined, requiredRoles?: string[]): boolean => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
};

/**
 * Higher-order component that implements secure route protection with role-based
 * access control, session validation, and error boundary protection.
 * 
 * @example
 * ```tsx
 * <PrivateRoute requiredRoles={['BUYER']} />
 * ```
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ requiredRoles }) => {
  const { isAuthenticated, loading, sessionExpiry, userRole } = useAuth();
  const location = useLocation();

  // Validate session on mount and when sessionExpiry changes
  useEffect(() => {
    if (sessionExpiry && !validateSession(sessionExpiry)) {
      // Force re-render to trigger redirect
      window.location.href = ROUTES.AUTH.LOGIN;
    }
  }, [sessionExpiry]);

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" label="Verifying authentication..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !validateSession(sessionExpiry)) {
    return (
      <Navigate 
        to={ROUTES.AUTH.LOGIN} 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // Check role-based access
  if (!validateAccess(userRole, requiredRoles)) {
    return (
      <Navigate 
        to={ROUTES.ERROR.FORBIDDEN} 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // Render protected route content within DashboardLayout and ErrorBoundary
  return (
    <ErrorBoundary
      id={`private-route-${location.pathname}`}
      fallback={
        <DashboardLayout>
          <div className="p-4">
            <h1 className="text-xl font-semibold text-gray-900">
              An error occurred while loading this page
            </h1>
            <p className="mt-2 text-gray-600">
              Please try refreshing the page or contact support if the problem persists.
            </p>
          </div>
        </DashboardLayout>
      }
    >
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default React.memo(PrivateRoute);