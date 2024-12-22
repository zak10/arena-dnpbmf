import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import Icon from './Icon';
import { IconName } from '../../assets/icons';

/**
 * Props interface for the Loading component with enhanced accessibility options
 */
interface LoadingProps {
  /** Size variant of the loading spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes to apply */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
  /** Whether to display inline or as a block */
  inline?: boolean;
  /** Force reduced motion mode */
  reducedMotion?: boolean;
}

/**
 * Custom hook to detect system reduced motion preference
 */
const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState<boolean>(() => {
    // Check initial preference on mount
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener for preference changes
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup listener on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
};

/**
 * Helper function to get size-specific icon and container dimensions
 */
const getSizeConfig = (size: LoadingProps['size'] = 'md') => {
  const configs = {
    sm: {
      iconSize: 16,
      containerClass: 'w-4 h-4',
    },
    md: {
      iconSize: 24,
      containerClass: 'w-6 h-6',
    },
    lg: {
      iconSize: 32,
      containerClass: 'w-8 h-8',
    },
  };
  
  return configs[size];
};

/**
 * Loading component that displays an accessible animated spinner
 * with support for reduced motion preferences and different sizes.
 * 
 * @example
 * ```tsx
 * // Default loading spinner
 * <Loading />
 * 
 * // Small inline loading spinner
 * <Loading size="sm" inline />
 * 
 * // Large loading spinner with custom label
 * <Loading size="lg" label="Processing your request..." />
 * ```
 */
const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  className,
  label = 'Loading...',
  inline = false,
  reducedMotion: reducedMotionProp = false,
}) => {
  // Generate unique ID for ARIA labelling
  const labelId = React.useId();
  
  // Check system reduced motion preference
  const systemReducedMotion = useReducedMotion();
  
  // Combine system preference with prop override
  const shouldReduceMotion = reducedMotionProp || systemReducedMotion;
  
  // Get size-specific configuration
  const { iconSize, containerClass } = getSizeConfig(size);
  
  // Construct className string with conditional styles
  const containerClasses = clsx(
    // Base styles
    'relative',
    inline ? 'inline-flex' : 'flex',
    'items-center justify-center',
    'transition-opacity duration-200',
    containerClass,
    
    // Motion styles
    {
      'motion-safe:animate-spin transform-gpu': !shouldReduceMotion,
      'opacity-50': shouldReduceMotion,
    },
    
    // Custom classes
    className
  );

  return (
    <div
      role="status"
      aria-labelledby={labelId}
      className={containerClasses}
    >
      {/* Loading spinner icon */}
      <Icon
        name={IconName.ARROW_RIGHT}
        size={iconSize}
        className="text-gray-400"
        aria-hidden="true"
      />
      
      {/* Visually hidden label for screen readers */}
      <span
        id={labelId}
        className="sr-only"
      >
        {label}
      </span>
    </div>
  );
};

// Error boundary wrapper for production resilience
class LoadingErrorBoundary extends React.Component<
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
      return <div role="status" aria-label="Loading" />;
    }

    return this.props.children;
  }
}

// Export wrapped component
export default React.memo(function WrappedLoading(props: LoadingProps) {
  return (
    <LoadingErrorBoundary>
      <Loading {...props} />
    </LoadingErrorBoundary>
  );
});