import React, { memo, useEffect, useCallback, useRef } from 'react'; // v18.0.0
import { useDispatch } from 'react-redux'; // v8.0.0
import classNames from 'classnames'; // v2.3.0
import { uiActions } from '../../store/ui/uiSlice';
import Icon from './Icon';
import { IconName } from '../../assets/icons';

// Animation duration in milliseconds
const ANIMATION_DURATION = 300;

// Toast positions following 8px grid system
export const TOAST_POSITIONS = {
  TOP_RIGHT: 'top-4 right-4',
  TOP_LEFT: 'top-4 left-4',
  BOTTOM_RIGHT: 'bottom-4 right-4',
  BOTTOM_LEFT: 'bottom-4 left-4',
} as const;

// Toast variants with consistent color schemes and accessibility
export const TOAST_VARIANTS = {
  success: {
    bgColor: 'bg-green-50',
    textColor: 'text-green-800',
    borderColor: 'border-green-500',
    focusRing: 'focus:ring-green-500',
    icon: IconName.CHECK,
  },
  error: {
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    borderColor: 'border-red-500',
    focusRing: 'focus:ring-red-500',
    icon: IconName.ERROR,
  },
  warning: {
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-500',
    focusRing: 'focus:ring-yellow-500',
    icon: IconName.WARNING,
  },
  info: {
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-500',
    focusRing: 'focus:ring-blue-500',
    icon: IconName.INFO,
  },
} as const;

export type NotificationType = keyof typeof TOAST_VARIANTS;

export interface ToastProps {
  /** Unique identifier for the toast */
  id: string;
  /** Message to display in the toast */
  message: string;
  /** Type of notification that determines styling and icon */
  type: NotificationType;
  /** Whether to automatically dismiss the toast */
  autoDismiss?: boolean;
  /** Time in milliseconds before auto-dismissing */
  dismissTimeout?: number;
  /** Position of the toast on the screen */
  position?: keyof typeof TOAST_POSITIONS;
  /** Callback function when toast is closed */
  onClose?: (id: string) => void;
}

/**
 * Toast notification component that displays temporary messages with different
 * severity levels and supports auto-dismiss functionality.
 * Implements WCAG 2.1 Level AA compliance.
 */
const Toast: React.FC<ToastProps> = memo(({
  id,
  message,
  type,
  autoDismiss = true,
  dismissTimeout = 5000,
  position = 'TOP_RIGHT',
  onClose,
}) => {
  const dispatch = useDispatch();
  const toastRef = useRef<HTMLDivElement>(null);
  const variant = TOAST_VARIANTS[type];

  // Handle toast dismissal
  const handleDismiss = useCallback(() => {
    if (toastRef.current) {
      toastRef.current.style.opacity = '0';
      toastRef.current.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        dispatch(uiActions.removeNotification(id));
        onClose?.(id);
      }, ANIMATION_DURATION);
    }
  }, [dispatch, id, onClose]);

  // Set up auto-dismiss timer
  useEffect(() => {
    let dismissTimer: NodeJS.Timeout;

    if (autoDismiss && dismissTimeout > 0) {
      dismissTimer = setTimeout(handleDismiss, dismissTimeout);
    }

    return () => {
      if (dismissTimer) {
        clearTimeout(dismissTimer);
      }
    };
  }, [autoDismiss, dismissTimeout, handleDismiss]);

  // Handle keyboard interactions
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleDismiss();
    }
  }, [handleDismiss]);

  // Compose class names
  const toastClasses = classNames(
    // Base styles following 8px grid
    'fixed flex items-center p-4 min-w-[320px] max-w-[480px] rounded-lg border',
    'shadow-lg transition-all duration-300 ease-in-out',
    // Animation initial state
    'opacity-0 translate-x-full',
    // Variant-specific styles
    variant.bgColor,
    variant.textColor,
    variant.borderColor,
    // Position
    TOAST_POSITIONS[position],
    // Focus styles
    'focus:outline-none focus:ring-2',
    variant.focusRing
  );

  // Handle mount animation
  useEffect(() => {
    if (toastRef.current) {
      requestAnimationFrame(() => {
        if (toastRef.current) {
          toastRef.current.style.opacity = '1';
          toastRef.current.style.transform = 'translateX(0)';
        }
      });
    }
  }, []);

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live="polite"
      className={toastClasses}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Icon */}
      <Icon
        name={variant.icon}
        size={24}
        className="flex-shrink-0 mr-3"
        title={`${type} notification`}
      />
      
      {/* Message */}
      <div className="flex-1 mr-2 text-sm font-medium">
        {message}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        className={classNames(
          'flex-shrink-0 p-1 rounded-full transition-colors',
          'hover:bg-black/5 focus:outline-none focus:ring-2',
          variant.focusRing
        )}
        aria-label="Close notification"
      >
        <Icon name={IconName.CLOSE} size={16} />
      </button>
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;