import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { useLocation, useNavigate } from 'react-router-dom'; // v6.0.0
import Button from '../common/Button';
import Icon from '../common/Icon';
import { IconName } from '../../assets/icons';
import { ROUTES } from '../../constants/routes';

/**
 * Props interface for the Sidebar component with mobile control
 */
export interface SidebarProps {
  /** Controls sidebar visibility in mobile view */
  isOpen: boolean;
  /** Callback function to close sidebar in mobile view */
  onClose: () => void;
  /** Optional additional CSS classes for customization */
  className?: string;
  /** Text direction for RTL support */
  dir?: 'ltr' | 'rtl';
}

/**
 * Interface for navigation menu items with accessibility support
 */
export interface NavItem {
  /** Display text for navigation item */
  label: string;
  /** Route path for navigation */
  path: string;
  /** Icon name for navigation item */
  icon: IconName;
  /** Accessible label for screen readers */
  ariaLabel: string;
}

/**
 * Navigation items configuration following F-pattern layout
 */
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: ROUTES.DASHBOARD.INDEX,
    icon: IconName.MENU,
    ariaLabel: 'Navigate to dashboard',
  },
  {
    label: 'Requests',
    path: ROUTES.REQUESTS.LIST,
    icon: IconName.FILTER,
    ariaLabel: 'View all requests',
  },
  {
    label: 'Proposals',
    path: ROUTES.PROPOSALS.LIST,
    icon: IconName.SORT,
    ariaLabel: 'View all proposals',
  },
];

/**
 * Constants for responsive behavior and animations
 */
const TRANSITION_DURATION = 300;
const MOBILE_BREAKPOINT = 768;
const TOUCH_TARGET_SIZE = 44;

/**
 * A responsive, accessible sidebar component that provides navigation and filtering options
 * for the Arena MVP application. Implements mobile-first design with RTL support.
 */
const Sidebar: React.FC<SidebarProps> = React.memo(({
  isOpen,
  onClose,
  className,
  dir = 'ltr',
}) => {
  // Routing hooks for navigation and active state
  const location = useLocation();
  const navigate = useNavigate();

  // Ref for handling touch interactions
  const touchStartX = React.useRef<number>(0);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  // Handle navigation item click
  const handleNavClick = React.useCallback((path: string) => {
    navigate(path);
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      onClose();
    }
  }, [navigate, onClose]);

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent, path: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavClick(path);
    }
  }, [handleNavClick]);

  // Touch gesture handlers for mobile
  const handleTouchStart = React.useCallback((event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  }, []);

  const handleTouchMove = React.useCallback((event: React.TouchEvent) => {
    if (!sidebarRef.current) return;

    const touchCurrentX = event.touches[0].clientX;
    const deltaX = touchCurrentX - touchStartX.current;

    // Close sidebar on swipe left (LTR) or right (RTL)
    if ((dir === 'ltr' && deltaX < -50) || (dir === 'rtl' && deltaX > 50)) {
      onClose();
    }
  }, [dir, onClose]);

  // Construct className using clsx for conditional styles
  const sidebarClasses = clsx(
    // Base styles
    'fixed inset-y-0 z-30 flex flex-col',
    'w-64 bg-white shadow-lg',
    'transition-transform duration-300 ease-in-out',
    'overflow-y-auto',
    
    // RTL support
    dir === 'ltr' ? 'left-0' : 'right-0',
    
    // Mobile responsive behavior
    {
      'translate-x-0': isOpen,
      '-translate-x-full': !isOpen && dir === 'ltr',
      'translate-x-full': !isOpen && dir === 'rtl',
    },
    
    // Custom classes
    className
  );

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main sidebar */}
      <aside
        ref={sidebarRef}
        className={sidebarClasses}
        role="navigation"
        aria-label="Main navigation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-end p-4 lg:hidden">
          <Button
            variant="ghost"
            size="small"
            onClick={onClose}
            aria-label="Close navigation menu"
            leftIcon={IconName.CLOSE}
          />
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <div
                key={item.path}
                className="min-h-[44px]" // Ensure minimum touch target size
              >
                <button
                  onClick={() => handleNavClick(item.path)}
                  onKeyDown={(e) => handleKeyDown(e, item.path)}
                  className={clsx(
                    // Base styles
                    'group flex w-full items-center rounded-md px-3 py-2',
                    'min-h-[44px]', // Touch target size
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    'transition-colors duration-200',
                    
                    // Active/Hover states
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.ariaLabel}
                >
                  <Icon
                    name={item.icon}
                    size={24}
                    className={clsx(
                      'mr-3 flex-shrink-0',
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
});

// Display name for debugging
Sidebar.displayName = 'Sidebar';

export default Sidebar;