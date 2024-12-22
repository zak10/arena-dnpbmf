import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import MagicLinkForm from '../../components/auth/MagicLinkForm';
import { useAuth } from '../../hooks/useAuth';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import useAnalytics from '@arena/analytics';

/**
 * Login page component that provides both Google OAuth and Magic Link authentication
 * options following Arena MVP's security and accessibility requirements.
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, authError, clearAuthError } = useAuth();
  const analytics = useAnalytics();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear any existing auth errors when component mounts
  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  /**
   * Handles successful authentication from either method
   */
  const handleLoginSuccess = useCallback(() => {
    analytics.track('auth_success', {
      timestamp: new Date().toISOString(),
      method: 'google_oauth'
    });
    navigate('/dashboard');
  }, [navigate, analytics]);

  /**
   * Handles authentication errors with analytics tracking
   */
  const handleLoginError = useCallback((error: string) => {
    analytics.track('auth_error', {
      timestamp: new Date().toISOString(),
      error: error
    });
  }, [analytics]);

  return (
    <ErrorBoundary>
      <AuthLayout 
        title="Sign in to Arena"
        className="min-h-screen bg-gray-50"
      >
        <div className="space-y-8">
          {/* Google OAuth Section */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Sign in with Google Workspace
            </h2>
            <GoogleLoginButton
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              retryAttempts={3}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          {/* Magic Link Section */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Sign in with Magic Link
            </h2>
            <MagicLinkForm
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
            />
          </div>

          {/* Error Display */}
          {authError && (
            <div
              role="alert"
              className="mt-4 p-4 rounded-md bg-red-50 border border-red-200"
            >
              <p className="text-sm text-red-700">
                {authError.message}
              </p>
            </div>
          )}

          {/* Help Text */}
          <p className="mt-4 text-center text-sm text-gray-600">
            Having trouble signing in?{' '}
            <a 
              href="/help"
              className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              tabIndex={0}
            >
              Contact support
            </a>
          </p>
        </div>
      </AuthLayout>
    </ErrorBoundary>
  );
};

// Add display name for debugging
Login.displayName = 'LoginPage';

export default Login;