import React, { useEffect, useRef, useState } from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import Icon from './Icon';
import { IconName } from '../../assets/icons';

/**
 * Props interface for the Alert component with comprehensive type safety
 */
interface AlertProps {
  /** Content to be displayed within the alert */
  children: React.ReactNode;
  /** Determines alert appearance and semantic meaning */
  severity: 'success' | 'error' | 'warning' | 'info';
  /** Controls whether alert can be dismissed */
  dismissible?: boolean;
  /** Callback function when alert is dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes for customization */
  className?: string;
  /** Optional title text for the alert */
  title?: string;
}

// Mapping of severity levels to Tailwind CSS classes
const SEVERITY_STYLES = {
  success: 'bg-green-50 text-green-800 border-green-200 focus-within:ring-green-500 hover:bg-green-100',
  error: 'bg-red-50 text-red-800 border-red-200 focus-within:ring-red-500 hover:bg-red-100',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200 focus-within:ring-yellow-500 hover:bg-yellow-100',
  info: 'bg-blue-50 text-blue-800 border-blue-200 focus-within:ring-blue-500 hover:bg-blue-100'
} as const;

// Mapping of severity levels to appropriate icons
const SEVERITY_ICONS = {
  success: IconName.CHECK,
  error: IconName.ERROR,
  warning: IconName.WARNING,
  info: IconName.INFO
} as const;

// Animation classes for mount/unmount transitions
const TRANSITION_STYLES = {
  enter: 'transition-all duration-300 ease-in-out',
  exit: 'transition-all duration-200 ease-in-out opacity-0 scale-95'
} as const;

/**
 * Alert component that displays messages with different severity levels
 * following WCAG 2.1 Level AA accessibility standards.
 *
 * @example
 * ```tsx
 * <Alert severity="success" dismissible onDismiss={() => console.log('dismissed')}>
 *   Operation completed successfully
 * </Alert>
 * ```
 */
const Alert: React.FC<AlertProps> = ({
  children,
  severity,
  dismissible = false,
  onDismiss,
  className,
  title
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number>();

  // Handle keyboard interactions
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (dismissible && event.key === 'Escape' && isVisible) {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [dismissible, isVisible]);

  // Handle dismiss animation and callback
  const handleDismiss = () => {
    if (isExiting) return;
    
    setIsExiting(true);
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 200); // Match exit animation duration
  };

  // Don't render if not visible
  if (!isVisible) return null;

  // Construct class names
  const alertClasses = clsx(
    // Base styles
    'relative flex items-start p-4 border rounded-lg shadow-sm',
    'gap-3 text-left rtl:text-right',
    // Animation classes
    TRANSITION_STYLES.enter,
    isExiting && TRANSITION_STYLES.exit,
    // Severity-specific styles
    SEVERITY_STYLES[severity],
    // Custom classes
    className
  );

  return (
    <div
      ref={alertRef}
      role="alert"
      aria-live={severity === 'error' ? 'assertive' : 'polite'}
      className={alertClasses}
      data-severity={severity}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <Icon
          name={SEVERITY_ICONS[severity]}
          size={24}
          className="mt-0.5"
          title={`${severity} icon`}
        />
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0">
        {title && (
          <h4 className="font-semibold mb-1 text-sm">
            {title}
          </h4>
        )}
        <div className="text-sm whitespace-pre-wrap break-words">
          {children}
        </div>
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className={clsx(
            'flex-shrink-0 p-1 rounded-full',
            'focus:outline-none focus:ring-2',
            'transition-colors duration-150',
            'hover:bg-opacity-10 hover:bg-black',
            'active:bg-opacity-20 active:bg-black'
          )}
          aria-label="Dismiss alert"
        >
          <Icon
            name={IconName.CLOSE}
            size={16}
            title="Close alert"
          />
        </button>
      )}
    </div>
  );
};

export default Alert;