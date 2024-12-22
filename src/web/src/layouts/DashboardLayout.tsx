import React, { useCallback, useEffect, useState } from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import Footer from '../components/layout/Footer';
import ErrorBoundary from '../components/common/ErrorBoundary';

/**
 * Props interface for the DashboardLayout component
 */
interface DashboardLayoutProps {
  /** Child components to render in the main content area */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional initial state for sidebar visibility */
  initialSidebarState?: boolean;
}

/**
 * Main layout component that provides consistent structure for dashboard pages
 * with responsive behavior and accessibility support following F-pattern layout.
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  className,
  initialSidebarState = false
}) => {
  // State for mobile sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarState);
  
  // Track touch start position for mobile swipe gestures
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Handle window resize events
  useEffect(() => {
    const handleResize = () => {
      // Close sidebar on mobile when window is resized
      if (window.innerWidth >= 1024 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
      if (window.innerWidth < 1024 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Handle mobile touch events for sidebar
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const currentTouch = e.touches[0].clientX;
    const diff = touchStart - currentTouch;

    // Swipe right to open, left to close
    if (Math.abs(diff) > 50) {
      setIsSidebarOpen(diff < 0);
      setTouchStart(null);
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with Ctrl + B
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
      // Close sidebar with Escape
      if (e.key === 'Escape' && isSidebarOpen && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  return (
    <ErrorBoundary>
      <div 
        className={clsx(
          'min-h-screen bg-gray-50 flex flex-col',
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Skip to main content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 
                   bg-blue-600 text-white px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>

        {/* Header */}
        <Header
          className="fixed top-0 right-0 left-0 z-40"
          onMenuClick={() => setIsSidebarOpen(prev => !prev)}
        />

        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          className={clsx(
            'fixed inset-y-0 left-0 z-30',
            'w-64 transform transition-transform duration-300 ease-in-out',
            'lg:transform-none lg:translate-x-0'
          )}
        />

        {/* Main content */}
        <main
          id="main-content"
          className={clsx(
            'flex-1 pt-16 transition-all duration-300',
            'px-4 sm:px-6 lg:px-8',
            isSidebarOpen ? 'lg:pl-64' : ''
          )}
          role="main"
          tabIndex={-1}
        >
          {/* Mobile sidebar overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden"
              aria-hidden="true"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Page content */}
          <div className="py-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer 
          className={clsx(
            'transition-all duration-300',
            isSidebarOpen ? 'lg:pl-64' : ''
          )}
        />
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(DashboardLayout);