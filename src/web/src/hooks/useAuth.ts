/**
 * @fileoverview Custom React hook for managing authentication state and operations
 * @version 1.0.0
 * 
 * Implements secure authentication state management with:
 * - Magic link and Google OAuth support
 * - Session management with sliding window
 * - Role-based access control
 * - Comprehensive error handling
 */

import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  loginWithMagicLink, 
  loginWithGoogle, 
  logoutUser 
} from '../store/auth/authSlice';
import { User, UserRole } from '../types/auth';

// Session timeout in milliseconds (24 hours)
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

// Sliding session window in milliseconds (30 minutes)
const SLIDING_WINDOW = 30 * 60 * 1000;

/**
 * Custom hook for managing authentication state and operations
 * Provides unified interface for authentication flows and session management
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, error, sessionExpiry, lastActivity } = useAppSelector(
    state => state.auth
  );

  /**
   * Handles magic link authentication with enhanced security
   */
  const handleMagicLinkLogin = useCallback(async (token: string) => {
    try {
      // Validate token format
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid magic link token');
      }

      // Generate CSRF token
      const csrfToken = crypto.randomUUID();
      document.cookie = `XSRF-TOKEN=${csrfToken}; path=/; secure; samesite=strict`;

      await dispatch(loginWithMagicLink({ token, csrfToken })).unwrap();
    } catch (error) {
      console.error('Magic link authentication failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles Google OAuth authentication with enhanced security
   */
  const handleGoogleLogin = useCallback(async (token: string) => {
    try {
      // Validate OAuth token
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid Google OAuth token');
      }

      // Generate CSRF token
      const csrfToken = crypto.randomUUID();
      document.cookie = `XSRF-TOKEN=${csrfToken}; path=/; secure; samesite=strict`;

      await dispatch(loginWithGoogle({ token, csrfToken })).unwrap();
    } catch (error) {
      console.error('Google authentication failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles user logout with proper cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      
      // Clear session data
      document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      localStorage.removeItem('lastActivity');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Refreshes user session with sliding window
   */
  const refreshSession = useCallback(async () => {
    if (!isAuthenticated || !lastActivity) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity;

    // Force logout if session expired
    if (timeSinceLastActivity >= SESSION_TIMEOUT) {
      await handleLogout();
      return;
    }

    // Extend session if within sliding window
    if (timeSinceLastActivity <= SLIDING_WINDOW) {
      localStorage.setItem('lastActivity', now.toString());
      dispatch({ type: 'auth/updateLastActivity', payload: now });
    }
  }, [dispatch, isAuthenticated, lastActivity, handleLogout]);

  /**
   * Role-based access control helpers with type safety
   */
  const isBuyer = useCallback((): boolean => {
    return user?.role === UserRole.BUYER;
  }, [user]);

  const isArenaStaff = useCallback((): boolean => {
    return user?.role === UserRole.ARENA_STAFF;
  }, [user]);

  /**
   * Setup session refresh interval and cleanup
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = setInterval(refreshSession, 60000); // Check every minute

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, refreshSession]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    loginWithMagicLink: handleMagicLinkLogin,
    loginWithGoogle: handleGoogleLogin,
    logout: handleLogout,
    isBuyer,
    isArenaStaff,
    refreshSession
  };
}