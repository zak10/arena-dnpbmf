/**
 * @fileoverview Google OAuth login button component with enhanced security and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useState } from 'react'; // v18.0.0
import Button from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { IconName } from '../../assets/icons';
import { ErrorResponse } from '../../types/common';

/**
 * Props interface for the GoogleLoginButton component
 */
interface GoogleLoginButtonProps {
  /** Optional callback for successful login */
  onSuccess?: () => void;
  /** Optional callback for login errors with error details */
  onError?: (error: ErrorResponse) => void;
  /** Maximum number of retry attempts for failed authentication */
  retryAttempts?: number;
}

/**
 * Google OAuth login button component that implements secure authentication flow
 * with proper loading states, error handling, and accessibility features.
 *
 * @example
 * ```tsx
 * <GoogleLoginButton
 *   onSuccess={() => console.log('Login successful')}
 *   onError={(error) => console.error('Login failed:', error)}
 * />
 * ```
 */
const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  retryAttempts = 3
}) => {
  // Local state for loading and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Get authentication methods from auth hook
  const { loginWithGoogle } = useAuth();

  /**
   * Handles the Google OAuth authentication flow with enhanced security
   */
  const handleGoogleLogin = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Generate state parameter for CSRF protection
      const state = crypto.randomUUID();
      sessionStorage.setItem('google_oauth_state', state);

      // Initiate Google OAuth flow
      await loginWithGoogle({
        state,
        workspace: true, // Require Google Workspace account
      });

      // Clear state parameter after successful login
      sessionStorage.removeItem('google_oauth_state');

      // Call success callback if provided
      onSuccess?.();
    } catch (error) {
      console.error('Google authentication failed:', error);

      // Handle retry logic
      if (retryCount < retryAttempts) {
        setRetryCount(prev => prev + 1);
        // Call error callback with retry information
        onError?.({
          code: 'E1001',
          message: `Authentication failed. Retrying... (${retryCount + 1}/${retryAttempts})`,
          details: { error, retryCount: retryCount + 1 },
          severity: 'WARNING'
        });
      } else {
        // Call error callback with final error
        onError?.({
          code: 'E1001',
          message: 'Authentication failed. Please try again later.',
          details: { error },
          severity: 'ERROR'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [loginWithGoogle, onSuccess, onError, isLoading, retryCount, retryAttempts]);

  return (
    <Button
      variant="primary"
      size="large"
      isFullWidth
      isLoading={isLoading}
      leftIcon={IconName.USER}
      onClick={handleGoogleLogin}
      disabled={isLoading || retryCount >= retryAttempts}
      aria-label="Sign in with Google Workspace"
      data-testid="google-login-button"
    >
      {isLoading ? 'Signing in...' : 'Sign in with Google Workspace'}
    </Button>
  );
};

/**
 * Error boundary wrapper for production resilience
 */
class GoogleLoginButtonErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <Button
          variant="primary"
          size="large"
          isFullWidth
          disabled
          aria-label="Google sign in unavailable"
        >
          Sign in Unavailable
        </Button>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary
export default React.memo(function WrappedGoogleLoginButton(props: GoogleLoginButtonProps) {
  return (
    <GoogleLoginButtonErrorBoundary>
      <GoogleLoginButton {...props} />
    </GoogleLoginButtonErrorBoundary>
  );
});