/**
 * @fileoverview Custom React hook for managing toast notifications with enhanced error handling,
 * accessibility support, and advanced configuration options.
 * @version 1.0.0
 */

import { useDispatch } from '@reduxjs/toolkit'; // v1.9.0
import { uiActions } from '../../store/ui/uiSlice';
import type { ErrorResponse } from '../../types/common';

/**
 * Default configuration values for notifications
 */
const DEFAULT_AUTO_DISMISS = true;
const DEFAULT_DISMISS_TIMEOUT = 5000;
const DEFAULT_Z_INDEX = 1000;
const MAX_NOTIFICATIONS = 3;

/**
 * Map of error codes to user-friendly messages
 */
const ERROR_CODE_MAP: Record<string, string> = {
  E1001: 'Invalid credentials. Please try logging in again.',
  E1002: 'Your session has expired. Please log in again.',
  E1003: 'Invalid login link. Please request a new one.',
  E2001: 'Invalid request format. Please check your input.',
  E2002: 'Please fill in all required fields.',
  E2003: 'File upload failed. Please try again.',
  E3001: 'Invalid proposal status. Please refresh the page.',
  E3002: 'A proposal has already been submitted.',
  E3003: 'Missing required proposal information.',
  E4001: 'AI processing failed. Please try again later.',
  E4002: 'Connection error. Please check your internet.',
  E4003: 'Service temporarily unavailable. Please try again later.',
};

/**
 * Extended configuration options for notifications
 */
interface NotificationConfig {
  autoDismiss?: boolean;
  dismissTimeout?: number;
  zIndex?: number;
  template?: string;
  aria?: {
    role: string;
    live: 'polite' | 'assertive';
  };
  mobile?: {
    position: 'top' | 'bottom';
    stackBehavior: 'stack' | 'replace';
  };
}

/**
 * Configuration specific to error notifications
 */
interface ErrorNotificationConfig extends NotificationConfig {
  severity?: 'high' | 'medium' | 'low';
  errorCode?: string;
  retry?: boolean;
}

/**
 * Enhanced interface for notification helper functions
 */
interface NotificationHelpers {
  showSuccess: (message: string, config?: NotificationConfig) => void;
  showError: (error: ErrorResponse | string, config?: ErrorNotificationConfig) => void;
  showWarning: (message: string, config?: NotificationConfig) => void;
  showInfo: (message: string, config?: NotificationConfig) => void;
}

/**
 * Custom hook for managing toast notifications with enhanced features
 * @returns Object containing notification helper functions
 */
export const useNotification = (): NotificationHelpers => {
  const dispatch = useDispatch();

  /**
   * Maps error severity to notification configuration
   */
  const getSeverityConfig = (severity: string): Partial<NotificationConfig> => {
    switch (severity) {
      case 'CRITICAL':
        return {
          autoDismiss: false,
          aria: { role: 'alert', live: 'assertive' },
        };
      case 'ERROR':
        return {
          dismissTimeout: 7000,
          aria: { role: 'alert', live: 'polite' },
        };
      case 'WARNING':
        return {
          dismissTimeout: 5000,
          aria: { role: 'status', live: 'polite' },
        };
      default:
        return {
          dismissTimeout: DEFAULT_DISMISS_TIMEOUT,
          aria: { role: 'status', live: 'polite' },
        };
    }
  };

  /**
   * Shows a success notification
   */
  const showSuccess = (message: string, config?: NotificationConfig): void => {
    dispatch(uiActions.addNotification({
      message,
      severity: 'success',
      autoHide: config?.autoDismiss ?? DEFAULT_AUTO_DISMISS,
      duration: config?.dismissTimeout ?? DEFAULT_DISMISS_TIMEOUT,
      ...config,
    }));
  };

  /**
   * Shows an error notification with enhanced error handling
   */
  const showError = (error: ErrorResponse | string, config?: ErrorNotificationConfig): void => {
    let message: string;
    let severityConfig: Partial<NotificationConfig> = {};

    if (typeof error === 'string') {
      message = error;
      severityConfig = getSeverityConfig('ERROR');
    } else {
      message = ERROR_CODE_MAP[error.code] || error.message;
      severityConfig = getSeverityConfig(error.severity);
    }

    dispatch(uiActions.addNotification({
      message,
      severity: 'error',
      autoHide: config?.autoDismiss ?? severityConfig.autoDismiss ?? DEFAULT_AUTO_DISMISS,
      duration: config?.dismissTimeout ?? severityConfig.dismissTimeout,
      ...config,
    }));
  };

  /**
   * Shows a warning notification
   */
  const showWarning = (message: string, config?: NotificationConfig): void => {
    const severityConfig = getSeverityConfig('WARNING');
    
    dispatch(uiActions.addNotification({
      message,
      severity: 'warning',
      autoHide: config?.autoDismiss ?? severityConfig.autoDismiss ?? DEFAULT_AUTO_DISMISS,
      duration: config?.dismissTimeout ?? severityConfig.dismissTimeout,
      ...config,
    }));
  };

  /**
   * Shows an info notification
   */
  const showInfo = (message: string, config?: NotificationConfig): void => {
    dispatch(uiActions.addNotification({
      message,
      severity: 'info',
      autoHide: config?.autoDismiss ?? DEFAULT_AUTO_DISMISS,
      duration: config?.dismissTimeout ?? DEFAULT_DISMISS_TIMEOUT,
      ...config,
    }));
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default useNotification;