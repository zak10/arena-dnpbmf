/**
 * @fileoverview Footer component providing consistent bottom navigation, legal links,
 * and support information across the Arena MVP application.
 * @version 1.0.0
 */

import React from 'react'; // v18.0.0
import { Link } from 'react-router-dom'; // v6.0.0
import clsx from 'clsx'; // v2.0.0
import { ROUTES } from '../../constants/routes';

/**
 * Interface for Footer component props
 */
interface FooterProps {
  /** Optional CSS class name for custom styling */
  className?: string;
}

/**
 * Legal navigation links configuration
 */
const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
] as const;

/**
 * Support navigation links configuration
 */
const SUPPORT_LINKS = [
  { label: 'Help Center', href: '/help' },
  { label: 'Contact Support', href: '/support' },
] as const;

/**
 * Footer component providing consistent bottom navigation and information
 * Implements responsive design and accessibility features
 */
const Footer: React.FC<FooterProps> = React.memo(({ className = '' }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className={clsx(
        'w-full bg-white border-t border-gray-200',
        'px-4 py-6 md:px-6 md:py-8',
        className
      )}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Legal Links Section */}
          <nav
            aria-label="Legal Navigation"
            className="flex flex-col space-y-2 md:space-y-3"
          >
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Legal</h2>
            <ul className="space-y-2">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className={clsx(
                      'text-sm text-gray-600 hover:text-gray-900',
                      'transition-colors duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Support Links Section */}
          <nav
            aria-label="Support Navigation"
            className="flex flex-col space-y-2 md:space-y-3"
          >
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Support</h2>
            <ul className="space-y-2">
              {SUPPORT_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className={clsx(
                      'text-sm text-gray-600 hover:text-gray-900',
                      'transition-colors duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Authentication Links Section */}
          <nav
            aria-label="Authentication Navigation"
            className="flex flex-col space-y-2 md:space-y-3"
          >
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Account</h2>
            <ul className="space-y-2">
              <li>
                <Link
                  to={ROUTES.AUTH.LOGIN}
                  className={clsx(
                    'text-sm text-gray-600 hover:text-gray-900',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  )}
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.AUTH.RESET_PASSWORD}
                  className={clsx(
                    'text-sm text-gray-600 hover:text-gray-900',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  )}
                >
                  Reset Password
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Copyright Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            © {currentYear} Arena MVP. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});

// Display name for debugging purposes
Footer.displayName = 'Footer';

export default Footer;