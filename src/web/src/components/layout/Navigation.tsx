import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../common/Icon';
import ErrorBoundary from '../common/ErrorBoundary';
import { IconName } from '../../assets/icons';
import { UserRole } from '../../types/auth';

/**
 * Interface defining a navigation menu item with accessibility support
 */
interface NavigationItem {
  path: string;
  label: string;
  icon: IconName;
  roles: UserRole[];
  ariaLabel: string;
}

/**
 * Navigation component that renders the main navigation bar with role-based access
 * control and accessibility features.
 */
const Navigation: React.FC = React.memo(() => {
  const { isAuthenticated, isBuyer, isArenaStaff, isLoading } = useAuth();

  /**
   * Memoized navigation items with role-based access control
   */
  const navigationItems = useMemo<NavigationItem[]>(() => [
    {
      path: ROUTES.DASHBOARD.ROOT,
      label: 'Dashboard',
      icon: IconName.MENU,
      roles: [UserRole.BUYER, UserRole.ARENA_STAFF],
      ariaLabel: 'Navigate to dashboard'
    },
    {
      path: ROUTES.REQUESTS.ROOT,
      label: 'Requests',
      icon: IconName.SEARCH,
      roles: [UserRole.BUYER, UserRole.ARENA_STAFF],
      ariaLabel: 'View software evaluation requests'
    },
    {
      path: ROUTES.PROPOSALS.ROOT,
      label: 'Proposals',
      icon: IconName.FILTER,
      roles: [UserRole.BUYER, UserRole.ARENA_STAFF],
      ariaLabel: 'View vendor proposals'
    },
    {
      path: ROUTES.DASHBOARD.SETTINGS,
      label: 'Settings',
      icon: IconName.SETTINGS,
      roles: [UserRole.BUYER, UserRole.ARENA_STAFF],
      ariaLabel: 'Manage account settings'
    }
  ], []);

  /**
   * Filter navigation items based on user role and authentication status
   */
  const filteredItems = useMemo(() => {
    if (!isAuthenticated || isLoading) return [];

    return navigationItems.filter(item => {
      if (isBuyer() && item.roles.includes(UserRole.BUYER)) return true;
      if (isArenaStaff() && item.roles.includes(UserRole.ARENA_STAFF)) return true;
      return false;
    });
  }, [isAuthenticated, isBuyer, isArenaStaff, isLoading, navigationItems]);

  // Don't render navigation if not authenticated or still loading
  if (!isAuthenticated || isLoading) return null;

  return (
    <ErrorBoundary id="main-navigation">
      <nav
        className="flex flex-col space-y-2 w-full md:space-y-1 p-2 md:p-4"
        aria-label="Main navigation"
      >
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                // Base styles
                'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                'transition-colors focus:outline-none focus:ring-2',
                'focus:ring-offset-2 focus:ring-primary-500',
                // Active state
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
            aria-label={item.ariaLabel}
          >
            <Icon
              name={item.icon}
              size={24}
              className={clsx(
                'mr-3 flex-shrink-0 h-5 w-5',
                'text-gray-400 group-hover:text-gray-500'
              )}
              title={item.label}
            />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </ErrorBoundary>
  );
});

// Display name for debugging
Navigation.displayName = 'Navigation';

export default Navigation;