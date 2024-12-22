import React from 'react'; // ^18.0.0
import classNames from 'classnames'; // ^2.3.0
import { Card } from '../components/common/Card';

/**
 * Props interface for the AuthLayout component with enhanced accessibility and theme support
 */
interface AuthLayoutProps {
  /** Content to be rendered within the layout */
  children: React.ReactNode;
  /** Optional title for the auth page */
  title?: string;
  /** Loading state for auth transitions */
  isLoading?: boolean;
  /** Theme preference for the layout */
  theme?: 'light' | 'dark';
}

/**
 * Enhanced layout component for authentication pages with accessibility and theme support.
 * Implements Arena MVP's design system with proper spacing, branding, and responsive behavior.
 *
 * @component
 * @example
 * ```tsx
 * <AuthLayout title="Sign In" theme="light">
 *   <LoginForm />
 * </AuthLayout>
 * ```
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  isLoading = false,
  theme = 'light'
}) => {
  // Apply theme-specific classes
  const containerClasses = classNames(
    'min-h-screen flex items-center justify-center p-4',
    'transition-colors duration-200',
    {
      'bg-gray-50': theme === 'light',
      'bg-gray-900': theme === 'dark',
    }
  );

  const contentClasses = classNames(
    'w-full max-w-md mx-auto',
    'sm:px-6 md:px-8'
  );

  const logoClasses = classNames(
    'mb-8 text-center',
    'focus:outline-none focus:ring-2 focus:ring-primary-500',
    {
      'text-gray-900': theme === 'light',
      'text-white': theme === 'dark',
    }
  );

  const titleClasses = classNames(
    'text-2xl font-bold text-center mb-6',
    {
      'text-gray-900': theme === 'light',
      'text-white': theme === 'dark',
    }
  );

  return (
    <div 
      className={containerClasses}
      data-theme={theme}
      role="main"
      aria-busy={isLoading}
    >
      <div className={contentClasses}>
        {/* Accessible Logo Link */}
        <a 
          href="/"
          className={logoClasses}
          aria-label="Arena Home"
          tabIndex={0}
        >
          <img
            src="/logo.svg"
            alt="Arena Logo"
            className="h-12 w-auto mx-auto"
            aria-hidden="true"
          />
        </a>

        {/* Accessible Page Title */}
        {title && (
          <h1 className={titleClasses}>
            {title}
          </h1>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div 
            className="flex justify-center mb-4"
            role="status"
            aria-label="Loading"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        )}

        {/* Enhanced Card Component with Theme Support */}
        <Card
          className={classNames(
            'overflow-hidden',
            {
              'bg-white': theme === 'light',
              'bg-gray-800': theme === 'dark',
            }
          )}
          ariaLabel="Authentication form container"
        >
          {children}
        </Card>

        {/* Accessible Footer Links */}
        <footer className="mt-8 text-center text-sm">
          <nav
            className="space-x-4"
            aria-label="Authentication footer navigation"
          >
            <a
              href="/help"
              className={classNames(
                'text-gray-600 hover:text-primary-500 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 rounded',
                {
                  'text-gray-400 hover:text-primary-400': theme === 'dark'
                }
              )}
            >
              Need Help?
            </a>
            <a
              href="/privacy"
              className={classNames(
                'text-gray-600 hover:text-primary-500 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 rounded',
                {
                  'text-gray-400 hover:text-primary-400': theme === 'dark'
                }
              )}
            >
              Privacy Policy
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
};

// Add display name for debugging
AuthLayout.displayName = 'AuthLayout';

export default AuthLayout;