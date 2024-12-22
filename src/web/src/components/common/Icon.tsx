import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { IconName, icons } from '../../assets/icons';

/**
 * Props interface for the Icon component defining all possible configuration options
 */
interface IconProps {
  /** Name of the icon to render from the icon set */
  name: IconName;
  /** Size of the icon in pixels following 8px grid system */
  size?: 16 | 24 | 32 | 40 | 48;
  /** CSS color value for the icon */
  color?: string;
  /** Additional CSS classes to apply */
  className?: string;
  /** Accessible title for the icon */
  title?: string;
}

/**
 * Error boundary component to handle invalid icon names gracefully
 */
class IconErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; errorMessage: string } {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Failed to render icon',
    };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Render fallback UI for development environments
      if (process.env.NODE_ENV === 'development') {
        return (
          <div role="alert" className="text-red-500 text-sm">
            {this.state.errorMessage}
          </div>
        );
      }
      // Return empty element in production to fail gracefully
      return null;
    }

    return this.props.children;
  }
}

/**
 * Icon component that renders SVG icons from the Arena design system with consistent
 * styling and accessibility features.
 *
 * @example
 * ```tsx
 * <Icon name={IconName.CHECK} size={24} color="text-green-500" title="Success" />
 * ```
 */
const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = 'currentColor',
  className,
  title,
}) => {
  // Generate unique ID for title if provided
  const titleId = title ? `icon-${name.toLowerCase()}-${React.useId()}` : undefined;

  // Get the SVG component from our icons map
  const IconComponent = icons[name];

  // Construct className using clsx for conditional classes
  const iconClasses = clsx(
    'inline-block flex-shrink-0', // Base styles
    {
      'w-4 h-4': size === 16,
      'w-6 h-6': size === 24,
      'w-8 h-8': size === 32,
      'w-10 h-10': size === 40,
      'w-12 h-12': size === 48,
    },
    className
  );

  return (
    <IconErrorBoundary>
      <IconComponent
        className={iconClasses}
        style={{ color }} // Apply color through inline style for dynamic colors
        role="img" // Semantic role for accessibility
        aria-hidden={!title} // Hide from screen readers if no title provided
        {...(title && {
          'aria-labelledby': titleId,
        })}
      >
        {/* Render accessible title if provided */}
        {title && (
          <title id={titleId}>
            {title}
          </title>
        )}
      </IconComponent>
    </IconErrorBoundary>
  );
};

export default Icon;