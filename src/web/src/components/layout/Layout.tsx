import React, { useState, useCallback, useEffect } from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { UI_CONFIG } from '../../constants/common';

/**
 * Props interface for the Layout component
 */
interface LayoutProps {
  /** Child components to render in the main content area */
  children: React.ReactNode;
  /** Optional additional CSS classes for the layout container */
  className?: string;
}

/**
 * Main layout component that provides the consistent page structure for the Arena MVP application.
 * Implements responsive design, enhanced accessibility, and performance optimizations.
 */
const Layout: React.FC<LayoutProps> = React.memo(({ children, className }) => {
  // Authentication state for conditional rendering
  const { isAuthenticated } = useAuth();

  // Sidebar visibility state for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Track window width for responsive behavior
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Determine if sidebar should be shown based on breakpoints
  const shouldShowSidebar = isAuthenticated && (
    windowWidth >= UI_CONFIG.BREAKPOINTS.DESKTOP || isSidebarOpen
  );

  // Handle window resize with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth);
        // Close sidebar on desktop breakpoint
        if (window.innerWidth >= UI_CONFIG.BREAKPOINTS.DESKTOP) {
          setIsSidebarOpen(false);
        }
      }, 150); // Debounce resize events
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Toggle sidebar visibility
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Handle session expiration
  const handleSessionExpired = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <div 
      className={clsx(
        'min-h-screen flex flex-col',
        'bg-gray-50',
        className
      )}
    >
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className={clsx(
          'sr-only focus:not-sr-only',
          'focus:fixed focus:top-4 focus:left-4',
          'bg-blue-600 text-white',
          'px-4 py-2 rounded-md',
          'z-50'
        )}
      >
        Skip to main content
      </a>

      {/* Header with navigation */}
      <Header 
        className="fixed top-0 w-full z-40"
        onSessionExpired={handleSessionExpired}
      />

      {/* Main content area with sidebar */}
      <div className="flex flex-1 pt-16"> {/* Offset for fixed header */}
        {/* Responsive sidebar */}
        {isAuthenticated && (
          <Sidebar
            isOpen={shouldShowSidebar}
            onClose={() => setIsSidebarOpen(false)}
            className={clsx(
              'transition-transform duration-300',
              !shouldShowSidebar && '-translate-x-full'
            )}
          />
        )}

        {/* Main content */}
        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className={clsx(
            'flex-1',
            'transition-all duration-300',
            'focus:outline-none',
            {
              'ml-0 md:ml-64': shouldShowSidebar, // Sidebar width offset
              'px-4 sm:px-6 lg:px-8': true, // Responsive padding
              'py-6': true
            }
          )}
        >
          {/* Page content wrapper */}
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer className="mt-auto" />
    </div>
  );
});

// Display name for debugging
Layout.displayName = 'Layout';

// Error boundary wrapper for production resilience
class LayoutErrorBoundary extends React.Component<
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
      return (
        <div role="alert" className="min-h-screen flex items-center justify-center">
          <p>Something went wrong with the layout. Please try refreshing the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary
export default React.memo(function WrappedLayout(props: LayoutProps) {
  return (
    <LayoutErrorBoundary>
      <Layout {...props} />
    </LayoutErrorBoundary>
  );
});