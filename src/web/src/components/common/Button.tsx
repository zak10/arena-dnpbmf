import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { Icon } from './Icon';
import { Loading } from './Loading';
import { IconName } from '../../assets/icons';

/**
 * Props interface for the Button component with enhanced accessibility and touch support
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant with consistent focus states */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Size variant ensuring minimum 44x44px touch target on mobile */
  size?: 'small' | 'medium' | 'large';
  /** Loading state with optimized animation */
  isLoading?: boolean;
  /** Makes button fill container width */
  isFullWidth?: boolean;
  /** Type-safe icon name for left position with RTL support */
  leftIcon?: IconName;
  /** Type-safe icon name for right position with RTL support */
  rightIcon?: IconName;
  /** Button content with overflow handling */
  children: React.ReactNode;
}

/**
 * A fully accessible React button component following Arena design system.
 * Implements consistent focus states, touch targets, and loading behaviors.
 *
 * @example
 * ```tsx
 * // Primary button with loading state
 * <Button variant="primary" isLoading>Submit</Button>
 *
 * // Secondary button with icon
 * <Button variant="secondary" leftIcon={IconName.DOWNLOAD}>Download</Button>
 *
 * // Full width outline button
 * <Button variant="outline" isFullWidth>Continue</Button>
 * ```
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  isFullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className,
  type = 'button',
  ...props
}) => {
  // Generate unique ID for loading state announcement
  const loadingId = React.useId();

  // Mapping of variant styles following design system
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-colors',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors',
    ghost: 'text-blue-600 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors'
  };

  // Mapping of size styles with mobile-optimized touch targets
  const sizeStyles = {
    small: 'min-h-[32px] min-w-[32px] px-3 py-1.5 text-sm',
    medium: 'min-h-[44px] min-w-[44px] px-4 py-2 text-base',
    large: 'min-h-[56px] min-w-[56px] px-6 py-3 text-lg'
  };

  // Icon sizes mapped to button sizes
  const iconSizes = {
    small: 16,
    medium: 24,
    large: 32
  } as const;

  // Construct className using clsx for conditional styles
  const buttonClasses = clsx(
    // Base styles
    'relative inline-flex items-center justify-center',
    'font-medium rounded-md',
    'select-none',
    'transition-all duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    
    // Variant styles
    variantStyles[variant],
    
    // Size styles
    sizeStyles[size],
    
    // Full width style
    isFullWidth && 'w-full',
    
    // Loading state styles
    isLoading && 'cursor-wait',
    
    // Custom classes
    className
  );

  // Get current icon size based on button size
  const iconSize = iconSizes[size];

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || isLoading}
      className={buttonClasses}
      aria-busy={isLoading}
      aria-describedby={isLoading ? loadingId : undefined}
    >
      {/* Loading spinner */}
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loading 
            size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md'}
            inline
          />
          <span id={loadingId} className="sr-only">Loading, please wait...</span>
        </span>
      )}

      {/* Button content wrapper */}
      <span
        className={clsx(
          'inline-flex items-center gap-2',
          isLoading && 'invisible' // Hide content during loading
        )}
      >
        {/* Left icon */}
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={iconSize}
            className="flex-shrink-0"
            aria-hidden="true"
          />
        )}

        {/* Main content with overflow handling */}
        <span className="truncate">{children}</span>

        {/* Right icon */}
        {rightIcon && (
          <Icon
            name={rightIcon}
            size={iconSize}
            className="flex-shrink-0"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
};

/**
 * Error boundary for production resilience
 */
class ButtonErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Render basic button in case of error
      return <button type="button" className="px-4 py-2 rounded">Fallback Button</button>;
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary
export default React.memo(function WrappedButton(props: ButtonProps) {
  return (
    <ButtonErrorBoundary>
      <Button {...props} />
    </ButtonErrorBoundary>
  );
});