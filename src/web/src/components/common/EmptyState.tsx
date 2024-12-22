import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { Button } from './Button';
import { Icon } from './Icon';
import { IconName } from '../../assets/icons';

/**
 * Props interface for the EmptyState component
 */
interface EmptyStateProps {
  /** Main heading text to display */
  title: string;
  /** Secondary descriptive text */
  description?: string;
  /** Name of icon to display */
  icon?: IconName;
  /** URL of illustration to display */
  image?: string;
  /** Configuration for call-to-action button */
  actionButton?: {
    text: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * A reusable empty state component that displays a consistent message when content
 * is not available. Supports optional illustration, icon, and action button.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <EmptyState 
 *   title="No results found"
 *   description="Try adjusting your search filters"
 * />
 * 
 * // With icon and action
 * <EmptyState
 *   title="No requests yet"
 *   description="Create your first software evaluation request"
 *   icon={IconName.ADD}
 *   actionButton={{
 *     text: "Create Request",
 *     onClick: () => navigate('/requests/new')
 *   }}
 * />
 * ```
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  image,
  actionButton,
  className,
}) => {
  // Generate unique IDs for accessibility
  const titleId = React.useId();
  const descriptionId = React.useId();

  // Construct the ARIA labelledby value based on available content
  const ariaLabelledBy = [
    titleId,
    description ? descriptionId : null
  ].filter(Boolean).join(' ');

  return (
    <div
      role="region"
      aria-labelledby={ariaLabelledBy}
      className={clsx(
        // Base layout styles
        'flex flex-col items-center justify-center',
        'p-4 md:p-8',
        'text-center',
        'max-w-lg mx-auto',
        className
      )}
    >
      {/* Illustration */}
      {image && (
        <img
          src={image}
          alt="" // Decorative image
          className={clsx(
            'w-32 h-32 md:w-48 md:h-48',
            'mb-4 md:mb-6',
            'object-contain'
          )}
          loading="lazy"
        />
      )}

      {/* Icon */}
      {!image && icon && (
        <Icon
          name={icon}
          size={48}
          className={clsx(
            'mb-3 md:mb-4',
            'text-gray-400'
          )}
          aria-hidden="true"
        />
      )}

      {/* Title */}
      <h2
        id={titleId}
        className={clsx(
          'text-lg md:text-xl',
          'font-semibold',
          'text-gray-900',
          'mb-2'
        )}
      >
        {title}
      </h2>

      {/* Description */}
      {description && (
        <p
          id={descriptionId}
          className={clsx(
            'text-sm md:text-base',
            'text-gray-600',
            'mb-4 md:mb-6'
          )}
        >
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionButton && (
        <Button
          variant="primary"
          onClick={actionButton.onClick}
          className="mt-2 md:mt-4"
        >
          {actionButton.text}
        </Button>
      )}
    </div>
  );
};

/**
 * Error boundary for production resilience
 */
class EmptyStateErrorBoundary extends React.Component<
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
      // Render minimal fallback in production
      return (
        <div role="region" className="p-4 text-center">
          <p className="text-gray-900 font-medium">No content available</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary and memo optimization
export default React.memo(function WrappedEmptyState(props: EmptyStateProps) {
  return (
    <EmptyStateErrorBoundary>
      <EmptyState {...props} />
    </EmptyStateErrorBoundary>
  );
});