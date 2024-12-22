import React, { useCallback, useEffect } from 'react'; // v18.0.0
import { useNavigate } from 'react-router-dom'; // v6.0.0
import { Alert } from '../../components/common/Alert';

// Default error message for server errors
const DEFAULT_ERROR_MESSAGE = 'An unexpected server error occurred. Please try again later.';

/**
 * Props interface for the ServerError component
 */
interface ServerErrorProps {
  /** Custom error message to display */
  message?: string;
}

/**
 * A 500 Internal Server Error page component that provides a user-friendly error message
 * and retry functionality. Follows WCAG 2.1 Level AA accessibility guidelines.
 *
 * @example
 * ```tsx
 * <ServerError message="Custom error message" />
 * ```
 */
const ServerError: React.FC<ServerErrorProps> = ({ message = DEFAULT_ERROR_MESSAGE }) => {
  const navigate = useNavigate();

  /**
   * Handles retry action when user clicks retry button or presses Enter key
   */
  const handleRetry = useCallback(() => {
    try {
      // First attempt to reload the current page
      window.location.reload();
    } catch (error) {
      try {
        // If reload fails, try to go back
        navigate(-1);
      } catch (navigationError) {
        // If navigation fails, redirect to dashboard
        navigate('/dashboard');
      }
    }
  }, [navigate]);

  // Add keyboard support for retry action
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        handleRetry();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRetry]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gray-50"
      role="main"
      aria-labelledby="error-title"
    >
      <div className="w-full max-w-md">
        <h1 
          id="error-title"
          className="sr-only"
        >
          500 Internal Server Error
        </h1>

        <div className="space-y-6 text-center">
          {/* Error Alert */}
          <Alert 
            severity="error"
            title="Server Error"
            className="mb-6"
          >
            {message}
          </Alert>

          {/* Retry Button */}
          <button
            type="button"
            onClick={handleRetry}
            className={`
              w-full sm:w-auto px-6 py-3 
              bg-blue-600 text-white font-medium
              rounded-lg shadow-sm
              hover:bg-blue-700 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              text-base
            `}
            aria-label="Retry loading the page"
          >
            Try Again
          </button>

          {/* Help Text */}
          <p className="text-sm text-gray-600">
            If the problem persists, please contact{' '}
            <a 
              href="mailto:support@arena.com"
              className="text-blue-600 hover:text-blue-700 focus:outline-none focus:underline"
            >
              support@arena.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServerError;