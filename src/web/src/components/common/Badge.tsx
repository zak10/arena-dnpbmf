// @version react@18.0.0
import React from 'react';
// @version clsx@2.0.0
import clsx from 'clsx';

/**
 * Props interface for Badge component with comprehensive type safety
 */
export interface BadgeProps {
  /** Content to be displayed inside the badge, supports text, numbers, and nested elements */
  children: React.ReactNode;
  /** Visual style variant of the badge with semantic color mapping */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** Size variant of the badge following 8px grid system */
  size?: 'sm' | 'md' | 'lg';
  /** Optional additional CSS classes for custom styling */
  className?: string;
  /** Optional accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Style mappings for badge variants with dark mode support
 * Each variant includes background, text color, and ring color
 */
const VARIANT_STYLES = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 ring-gray-500/10',
  primary: 'bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100 ring-primary-500/10',
  success: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 ring-green-500/10',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 ring-yellow-500/10',
  error: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 ring-red-500/10',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 ring-blue-500/10',
} as const;

/**
 * Size variants following 8px grid system
 * Includes text size, padding, line height, and font weight
 */
const SIZE_STYLES = {
  sm: 'text-xs px-2 py-0.5 leading-4 font-medium',
  md: 'text-sm px-2.5 py-1 leading-5 font-medium',
  lg: 'text-base px-3 py-1.5 leading-6 font-semibold',
} as const;

/**
 * Base styles applied to all badge variants
 * Ensures consistent appearance and proper spacing
 */
const BASE_STYLES = 'rounded-full inline-flex items-center justify-center ring-1 ring-inset transition-colors';

/**
 * Badge component for displaying status indicators, labels, and counts
 * Supports different variants, sizes, and meets WCAG 2.1 Level AA accessibility standards
 *
 * @example
 * ```tsx
 * <Badge variant="success" size="md">Completed</Badge>
 * <Badge variant="warning" ariaLabel="3 pending items">3</Badge>
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  ariaLabel,
}) => {
  // Combine all styles using clsx utility
  const badgeStyles = clsx(
    BASE_STYLES,
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    className
  );

  return (
    <span 
      className={badgeStyles}
      aria-label={ariaLabel}
      // If no ariaLabel is provided, ensure content is read by screen readers
      role={ariaLabel ? 'status' : undefined}
    >
      {children}
    </span>
  );
};

// Default export for convenient importing
export default Badge;