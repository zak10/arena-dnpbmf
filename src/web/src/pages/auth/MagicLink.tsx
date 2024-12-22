import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.0.0
import AuthLayout from '../../layouts/AuthLayout';
import MagicLinkForm from '../../components/auth/MagicLinkForm';
import { useAuth } from '../../hooks/useAuth';
import type { BusinessEmail } from '../../types/auth';

/**
 * Magic link authentication page component that implements secure email-based
 * authentication with comprehensive validation, rate limiting, and accessibility features.
 * 
 * Features:
 * - Business email validation with domain restrictions
 * - Rate limiting (3 attempts per hour)
 * - Accessible error messages and states
 * - Loading state management
 * - Security headers and CSRF protection
 * 
 * @component
 */
const MagicLinkPage: React.FC = () => {
  // State management
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const navigate = useNavigate();
  const { loginWithMagicLink } = useAuth();

  /**
   * Handles successful magic link request submission with rate limiting checks
   * and error handling
   */
  const handleSuccess = useCallback(async (email: BusinessEmail) => {
    try {
      setIsLoading(true);
      setError(null);

      // Request magic link with rate limiting
      await loginWithMagicLink(email);

      // Update UI state on success
      setIsSubmitted(true);
      setIsLoading(false);

      // Redirect to check email page after short delay
      setTimeout(() => {
        navigate('/auth/check-email', { 
          state: { email },
          replace: true 
        });
      }, 1500);

    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
      
      // Log error for monitoring
      console.error('Magic link request failed:', err);
    }
  }, [navigate, loginWithMagicLink]);

  /**
   * Handles error display with proper accessibility announcements
   */
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    // Announce error to screen readers
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
      errorAlert.setAttribute('role', 'alert');
    }
  }, []);

  return (
    <AuthLayout
      title="Sign in with Email"
      isLoading={isLoading}
      theme="light"
    >
      <div className="space-y-6">
        {/* Success Message */}
        {isSubmitted && (
          <div
            className="bg-green-50 p-4 rounded-md"
            role="status"
            aria-live="polite"
          >
            <p className="text-green-800 text-sm font-medium">
              Magic link sent! Check your email to continue.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            id="error-alert"
            className="bg-red-50 p-4 rounded-md"
            role="alert"
          >
            <p className="text-red-800 text-sm font-medium">
              {error}
            </p>
          </div>
        )}

        {/* Magic Link Form */}
        {!isSubmitted && (
          <>
            <p className="text-gray-600 text-sm">
              Enter your business email address to receive a secure login link.
            </p>

            <MagicLinkForm
              onSuccess={handleSuccess}
              onError={handleError}
            />

            {/* Additional Help Text */}
            <p className="mt-4 text-xs text-gray-500">
              Having trouble? Contact{' '}
              <a 
                href="mailto:support@arena.com"
                className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                support@arena.com
              </a>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

// Add display name for debugging
MagicLinkPage.displayName = 'MagicLinkPage';

export default MagicLinkPage;