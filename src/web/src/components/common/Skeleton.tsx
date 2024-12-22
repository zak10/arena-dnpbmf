import React from 'react'; // v18.0+
import clsx from 'clsx'; // v2.0.0
import '../../styles/animations.css';

/**
 * Props interface for the Skeleton component
 * Provides comprehensive customization options for loading placeholders
 */
interface SkeletonProps {
  /** Width of the skeleton element */
  width?: string | number;
  /** Height of the skeleton element */
  height?: string | number;
  /** Shape variant of the skeleton */
  variant?: 'text' | 'circular' | 'rectangular';
  /** Additional CSS classes for customization */
  className?: string;
  /** Whether to show loading animation */
  animation?: boolean;
  /** Custom aria-label for accessibility */
  ariaLabel?: string;
}

/**
 * A highly optimized loading placeholder component with accessibility features
 * 
 * @component
 * @example
 * // Text placeholder
 * <Skeleton width="200px" height="1rem" />
 * 
 * // Circular avatar placeholder
 * <Skeleton variant="circular" width={40} height={40} />
 * 
 * // Rectangular image placeholder
 * <Skeleton variant="rectangular" width="100%" height="200px" />
 */
const Skeleton: React.FC<SkeletonProps> = React.memo(({
  width = '100%',
  height = '1rem',
  variant = 'text',
  className,
  animation = true,
  ariaLabel = 'Loading...'
}) => {
  // Convert numeric dimensions to pixel values
  const formatDimension = (value: string | number): string => 
    typeof value === 'number' ? `${value}px` : value;

  // Base styles for the skeleton
  const baseStyles: React.CSSProperties = {
    width: formatDimension(width),
    height: formatDimension(height),
    willChange: 'background-position',
    backgroundColor: 'var(--color-background-alt)',
    position: 'relative',
    overflow: 'hidden',
  };

  // Variant-specific styles
  const variantStyles: React.CSSProperties = {
    ...(variant === 'circular' && {
      borderRadius: '50%',
    }),
    ...(variant === 'rectangular' && {
      borderRadius: 'var(--radius-md)',
    }),
    ...(variant === 'text' && {
      borderRadius: 'var(--radius-sm)',
    }),
  };

  // Dark mode support through CSS variables
  const darkModeStyles = {
    '[data-theme="dark"] &': {
      backgroundColor: 'var(--color-background-alt)',
    }
  };

  // High contrast mode support
  const highContrastStyles = {
    '[data-theme="high-contrast"] &': {
      backgroundColor: '#000000',
      opacity: 0.1,
    }
  };

  // Combine all styles
  const styles = {
    ...baseStyles,
    ...variantStyles,
    ...darkModeStyles,
    ...highContrastStyles,
  };

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-busy="true"
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx(
        // Base classes
        'relative overflow-hidden',
        // Animation classes with reduced motion support
        animation && 'animate-skeleton',
        // Custom classes
        className
      )}
      style={styles}
    >
      {/* Hidden text for screen readers */}
      <span className="sr-only">{ariaLabel}</span>
      
      {/* Shimmer effect overlay */}
      {animation && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            animation: 'shimmer 2s infinite',
            willChange: 'transform',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

// Display name for debugging
Skeleton.displayName = 'Skeleton';

// Export the component
export default Skeleton;

// Add keyframe animation for shimmer effect
const shimmerKeyframes = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

// Inject keyframes into document head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}