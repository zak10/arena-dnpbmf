import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.0.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import clsx from 'clsx'; // v2.0.0
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { Dropdown } from '../common/Dropdown';
import { useAuth } from '../../hooks/useAuth';
import { IconName } from '../../assets/icons';

/**
 * Props interface for the Header component
 */
interface HeaderProps {
  /** Additional CSS classes to apply */
  className?: string;
  /** Callback for session expiration */
  onSessionExpired?: () => void;
}

/**
 * Main navigation header component implementing Arena design system with full accessibility
 * and responsive design support following WCAG 2.1 Level AA guidelines.
 */
const Header: React.FC<HeaderProps> = ({
  className,
  onSessionExpired
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isSessionValid } = useAuth();

  // Check session validity periodically
  useEffect(() => {
    const checkSession = () => {
      if (!isSessionValid()) {
        onSessionExpired?.();
      }
    };

    const intervalId = setInterval(checkSession, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [isSessionValid, onSessionExpired]);

  // Handle secure logout with error handling
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate]);

  // Generate accessible profile menu items
  const getProfileMenuItems = useCallback(() => [
    {
      label: t('header.profile'),
      icon: IconName.USER,
      onClick: () => navigate('/profile')
    },
    {
      label: t('header.settings'),
      icon: IconName.SETTINGS,
      onClick: () => navigate('/settings')
    },
    {
      label: t('header.logout'),
      icon: IconName.LOGOUT,
      onClick: handleLogout
    }
  ], [t, navigate, handleLogout]);

  return (
    <header
      className={clsx(
        'fixed top-0 w-full bg-white border-b border-gray-200 z-50 print:hidden',
        className
      )}
      role="banner"
    >
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                 bg-primary-600 text-white px-4 py-2 rounded-md"
      >
        {t('common.skipToContent')}
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <a
              href="/"
              className="flex items-center"
              aria-label={t('common.homeLink')}
            >
              <span className="text-xl font-semibold text-gray-900">Arena</span>
            </a>
          </div>

          {/* Main Navigation */}
          <nav
            className="hidden sm:flex sm:items-center sm:space-x-8"
            aria-label={t('header.mainNavigation')}
          >
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
            >
              {t('header.dashboard')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/requests')}
              aria-current={location.pathname === '/requests' ? 'page' : undefined}
            >
              {t('header.requests')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/proposals')}
              aria-current={location.pathname === '/proposals' ? 'page' : undefined}
            >
              {t('header.proposals')}
            </Button>
          </nav>

          {/* User Profile Section */}
          <div className="flex items-center">
            {user ? (
              <Dropdown
                items={getProfileMenuItems()}
                trigger={
                  <button
                    className="flex items-center space-x-3 focus:outline-none focus-visible:ring-2 
                             focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-full"
                    aria-label={t('header.userMenu')}
                  >
                    <Avatar
                      name={user.name}
                      size={40}
                      className="flex-shrink-0"
                    />
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {user.name}
                    </span>
                  </button>
                }
                placement="bottom-end"
                width={200}
              />
            ) : (
              <Button
                variant="primary"
                onClick={() => navigate('/login')}
              >
                {t('header.signIn')}
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden">
            <Button
              variant="ghost"
              aria-label={t('header.toggleMenu')}
              leftIcon={IconName.MENU}
              onClick={() => {/* Toggle mobile menu */}}
              className="ml-4"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);