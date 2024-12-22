import React, { forwardRef, KeyboardEvent } from 'react';
import classNames from 'classnames'; // v2.3+
import '../styles/components.css';

interface CardProps {
  /** Card title - can be string or complex React node */
  title?: string | React.ReactNode;
  /** Main card content */
  children: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Enable hover animation effects */
  hoverable?: boolean;
  /** Enable interactive states for clickable cards */
  interactive?: boolean;
  /** Accessibility label */
  ariaLabel?: string;
  /** ARIA role override */
  ariaRole?: string;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** Keyboard event handler */
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
}

/**
 * A reusable card component that provides a consistent container layout with enhanced
 * accessibility and responsive features. Implements Arena MVP design system specifications.
 *
 * @component
 * @example
 * ```tsx
 * <Card 
 *   title="Example Card"
 *   hoverable
 *   interactive
 *   onClick={() => handleClick()}
 * >
 *   <p>Card content goes here</p>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLElement, CardProps>(({
  title,
  children,
  footer,
  className,
  hoverable = false,
  interactive = false,
  ariaLabel,
  ariaRole = 'article',
  onClick,
  onKeyDown,
  ...props
}, ref) => {
  // Handle keyboard interaction for accessibility
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (interactive && (e.key === 'Enter' || e.key === 'Space')) {
      e.preventDefault();
      onClick?.();
    }
    onKeyDown?.(e);
  };

  // Combine CSS classes based on props
  const cardClasses = classNames(
    'card',
    {
      'hover:shadow-md': hoverable,
      'cursor-pointer': interactive,
      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2': interactive,
    },
    className
  );

  // Determine the correct HTML element based on interactivity
  const Element = interactive ? 'button' : 'div';

  return (
    <Element
      ref={ref as any}
      className={cardClasses}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={ariaRole}
      aria-label={ariaLabel}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      {title && (
        <div className="card-header">
          {typeof title === 'string' ? (
            <h3 className="card-title text-lg font-medium mb-4">{title}</h3>
          ) : (
            title
          )}
        </div>
      )}

      <div className="card-content">
        {children}
      </div>

      {footer && (
        <div className="card-footer mt-4 pt-4 border-t border-border">
          {footer}
        </div>
      )}
    </Element>
  );
});

// Display name for debugging
Card.displayName = 'Card';

// Default props
Card.defaultProps = {
  hoverable: false,
  interactive: false,
  ariaRole: 'article'
};

export default Card;