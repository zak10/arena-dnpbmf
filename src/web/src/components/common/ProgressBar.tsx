// @version react@18.0.0
import React, { useMemo } from 'react';
// @version clsx@2.0.0
import clsx from 'clsx';

/**
 * Props interface for the ProgressBar component
 */
interface ProgressBarProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum progress value (default: 100) */
  max?: number;
  /** Accessible label for screen readers */
  label: string;
  /** Whether to show visual label */
  showLabel?: boolean;
  /** Size variant of progress bar */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant with theme support */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /** Additional CSS classes */
  className?: string;
  /** Enable smooth transition animations */
  animated?: boolean;
}

/**
 * Size-specific Tailwind CSS classes
 */
const SIZE_CLASSES = {
  sm: 'h-1 text-xs',
  md: 'h-2 text-sm',
  lg: 'h-3 text-base'
} as const;

/**
 * Theme-aware color variant classes
 */
const VARIANT_CLASSES = {
  primary: 'bg-primary-600 dark:bg-primary-500',
  success: 'bg-success-600 dark:bg-success-500',
  warning: 'bg-warning-600 dark:bg-warning-500',
  error: 'bg-error-600 dark:bg-error-500'
} as const;

/**
 * Base classes applied to all progress bars
 */
const BASE_CLASSES = 'relative overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700';

/**
 * Generates combined CSS classes for progress bar styling
 */
const getProgressBarClasses = (
  size: ProgressBarProps['size'] = 'md',
  variant: ProgressBarProps['variant'] = 'primary',
  className?: string,
  animated = true
): string => {
  return useMemo(() => {
    return clsx(
      BASE_CLASSES,
      SIZE_CLASSES[size],
      {
        'transition-all duration-300 ease-in-out': animated
      },
      className
    );
  }, [size, className, animated]);
};

/**
 * Calculates the width percentage for the progress bar
 */
const calculateProgressWidth = (value: number, max: number): string => {
  return useMemo(() => {
    if (max <= 0) {
      console.warn('ProgressBar: max value must be positive');
      max = 100;
    }
    
    const clampedValue = Math.min(Math.max(0, value), max);
    const percentage = (clampedValue / max) * 100;
    
    return `${percentage}%`;
  }, [value, max]);
};

/**
 * ProgressBar component displays progress completion status with theme and accessibility support
 * 
 * @example
 * ```tsx
 * <ProgressBar
 *   value={75}
 *   label="Upload progress"
 *   variant="primary"
 *   size="md"
 *   showLabel
 * />
 * ```
 */
const ProgressBar: React.FC<ProgressBarProps> = React.memo(({
  value,
  max = 100,
  label,
  showLabel = false,
  size = 'md',
  variant = 'primary',
  className,
  animated = true
}) => {
  const progressBarClasses = getProgressBarClasses(size, variant, className, animated);
  const progressWidth = calculateProgressWidth(value, max);
  
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={progressBarClasses}
    >
      <div
        className={clsx(
          'h-full rounded-full',
          VARIANT_CLASSES[variant],
          {
            'transition-width duration-300 ease-in-out': animated
          }
        )}
        style={{ width: progressWidth }}
      />
      {showLabel && (
        <span className="sr-only md:not-sr-only absolute inset-0 flex items-center justify-center text-center font-medium">
          {label} - {Math.round((value / max) * 100)}%
        </span>
      )}
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;