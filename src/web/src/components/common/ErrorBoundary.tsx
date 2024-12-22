import React from 'react'; // v18.0.0
import Alert from './Alert';
import { ErrorResponse } from '../../types/common';

/**
 * Props interface for the ErrorBoundary component with support for custom fallback UI
 */
interface ErrorBoundaryProps {
  /** Child components to be rendered and monitored for errors */
  children: React.ReactNode;
  /** Custom fallback UI to display when an error occurs */
  fallback?: React.ReactNode;
  /** Unique identifier for error tracking and debugging */
  id?: string;
}

/**
 * State interface for the ErrorBoundary component with enhanced error information
 */
interface ErrorBoundaryState {
  /** Standardized error object with code and message */
  error: ErrorResponse | null;
  /** Formatted component stack trace information */
  errorInfo: string;
  /** Flag indicating error state for optimized rendering */
  hasError: boolean;
}

// Default error message for production environments
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again later.';

// Prefix for error boundary IDs to aid in debugging
const ERROR_BOUNDARY_ID_PREFIX = 'arena-error-boundary-';

// Development environment check for enhanced error details
const DEV_ENV = process.env.NODE_ENV === 'development';

/**
 * Error boundary component that catches JavaScript errors anywhere in the child
 * component tree and displays a fallback UI with proper error tracking and
 * accessibility features.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />} id="request-form">
 *   <RequestForm />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      errorInfo: '',
      hasError: false
    };
  }

  /**
   * Static lifecycle method called when an error occurs to update state
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Format error into standardized ErrorResponse structure
    const errorResponse: ErrorResponse = {
      code: 'E4001', // System error code
      message: DEV_ENV ? error.message : DEFAULT_ERROR_MESSAGE,
      details: {
        name: error.name,
        stack: error.stack
      },
      severity: 'ERROR'
    };

    return {
      error: errorResponse,
      errorInfo: '',
      hasError: true
    };
  }

  /**
   * Lifecycle method called after an error has been thrown to handle error reporting
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Format error stack trace for readability
    const formattedStack = errorInfo.componentStack
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n');

    // Log detailed error information in development
    if (DEV_ENV) {
      console.group('Error Boundary Caught Error:');
      console.error('Error:', error);
      console.error('Component Stack:', formattedStack);
      console.groupEnd();
    }

    // Update state with formatted error information
    this.setState({
      errorInfo: formattedStack
    });

    // Announce error to screen readers
    const errorMessage = DEV_ENV ? error.message : DEFAULT_ERROR_MESSAGE;
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.textContent = `Error: ${errorMessage}`;
    document.body.appendChild(announcement);
    
    // Clean up announcement after screen readers have time to announce
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Renders either the error UI or the children components
   */
  render(): React.ReactNode {
    const { children, fallback, id } = this.props;
    const { hasError, error, errorInfo } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided, otherwise render default error Alert
      const errorUI = fallback || (
        <Alert 
          severity="error"
          title="Application Error"
          className="m-4"
        >
          <div className="space-y-2">
            <p>{error.message}</p>
            {DEV_ENV && errorInfo && (
              <pre className="mt-2 p-2 bg-red-50 rounded text-xs overflow-auto max-h-40">
                {errorInfo}
              </pre>
            )}
          </div>
        </Alert>
      );

      return (
        <div
          id={id ? `${ERROR_BOUNDARY_ID_PREFIX}${id}` : undefined}
          role="alert"
          aria-live="assertive"
          data-error-code={error.code}
          data-error-boundary
        >
          {errorUI}
        </div>
      );
    }

    // No error, render children normally
    return children;
  }
}

export default ErrorBoundary;