// @version React ^18.0.0
// @version react-router-dom ^6.4.0

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Lazy load route components for code splitting
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Requests = lazy(() => import('../pages/Requests'));
const RequestDetail = lazy(() => import('../pages/RequestDetail'));
const Proposals = lazy(() => import('../pages/Proposals'));
const ProposalComparison = lazy(() => import('../pages/ProposalComparison'));
const Settings = lazy(() => import('../pages/Settings'));
const Login = lazy(() => import('../pages/Login'));
const MagicLink = lazy(() => import('../pages/MagicLink'));
const NotFound = lazy(() => import('../pages/NotFound'));
const ErrorBoundary = lazy(() => import('../components/ErrorBoundary'));
const MainLayout = lazy(() => import('../layouts/MainLayout'));
const PublicLayout = lazy(() => import('../layouts/PublicLayout'));

// Route guard components
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuth(); // Custom hook to check authentication state
  const userRole = useUserRole(); // Custom hook to get user role

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access control
  if (!hasRequiredRole(userRole, children)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Loading fallback component with ARIA attributes
const LoadingFallback: React.FC = () => (
  <div 
    role="alert" 
    aria-busy="true"
    className="loading-container"
  >
    <div className="loading-spinner" aria-label="Loading content" />
  </div>
);

// Main routing component
const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/magic-link"
                element={
                  <PublicRoute>
                    <MagicLink />
                  </PublicRoute>
                }
              />
            </Route>

            {/* Protected routes */}
            <Route element={<MainLayout />}>
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/requests"
                element={
                  <PrivateRoute>
                    <Requests />
                  </PrivateRoute>
                }
              />
              <Route
                path="/requests/:id"
                element={
                  <PrivateRoute>
                    <RequestDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="/proposals"
                element={
                  <PrivateRoute>
                    <Proposals />
                  </PrivateRoute>
                }
              />
              <Route
                path="/proposals/compare/:requestId"
                element={
                  <PrivateRoute>
                    <ProposalComparison />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                }
              />
            </Route>

            {/* Error and fallback routes */}
            <Route path="/unauthorized" element={<NotFound />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

// Type declarations for custom hooks
interface UserRole {
  type: 'buyer' | 'arena_staff';
  permissions: string[];
}

const useAuth = (): boolean => {
  // Implementation would check JWT token validity and session state
  return false;
};

const useUserRole = (): UserRole => {
  // Implementation would get user role from auth context
  return { type: 'buyer', permissions: [] };
};

const hasRequiredRole = (role: UserRole, component: React.ReactNode): boolean => {
  // Implementation would check component's required roles against user role
  return true;
};

export default AppRoutes;