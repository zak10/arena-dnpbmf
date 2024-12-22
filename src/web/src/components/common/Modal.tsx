import React from 'react'; // v18.0.0
import { createPortal } from 'react-dom'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import FocusTrap from 'focus-trap-react'; // v10.0.0
import { Button } from './Button';
import { Icon } from './Icon';
import { IconName } from '../../assets/icons';

/**
 * Props interface for the Modal component
 */
interface ModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title shown in header */
  title: string;
  /** Controls modal width */
  size?: 'small' | 'medium' | 'large';
  /** Close modal when clicking backdrop */
  closeOnBackdrop?: boolean;
  /** Close modal when pressing Escape key */
  closeOnEsc?: boolean;
  /** Modal content */
  children: React.ReactNode;
  /** Element to focus when modal opens */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Callback after enter/exit animations complete */
  onAnimationComplete?: () => void;
}

/**
 * Custom hook to manage modal animation states
 */
const useModalAnimation = (
  isOpen: boolean,
  onAnimationComplete?: () => void
) => {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [animationClass, setAnimationClass] = React.useState('');
  const animationFrame = React.useRef<number>();

  React.useEffect(() => {
    setIsAnimating(true);
    
    // Cancel any existing animation frame
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    // Schedule animation frame
    animationFrame.current = requestAnimationFrame(() => {
      setAnimationClass(isOpen ? 'animate-modal-enter' : 'animate-modal-exit');
      
      // Animation duration matches CSS (200ms)
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onAnimationComplete?.();
      }, 200);

      return () => clearTimeout(timer);
    });

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [isOpen, onAnimationComplete]);

  return { isAnimating, animationClass };
};

/**
 * Custom hook to manage focus trap and keyboard interactions
 */
const useModalFocus = (
  isOpen: boolean,
  onClose: () => void,
  closeOnEsc: boolean,
  initialFocusRef?: React.RefObject<HTMLElement>
) => {
  // Store previously focused element
  const previousFocus = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocus.current = document.activeElement as HTMLElement;
      
      // Handle Escape key
      const handleEscape = (event: KeyboardEvent) => {
        if (closeOnEsc && event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        // Restore focus on close
        previousFocus.current?.focus();
      };
    }
  }, [isOpen, onClose, closeOnEsc]);

  const focusTrapOptions = {
    initialFocus: initialFocusRef?.current,
    fallbackFocus: '[data-modal-fallback-focus]',
    escapeDeactivates: false, // We handle Escape key separately
    returnFocusOnDeactivate: false // We handle focus restoration separately
  };

  return { focusTrapOptions };
};

/**
 * A reusable modal dialog component that implements the Arena design system's modal patterns.
 * Supports different sizes, animations, and accessibility features.
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Confirm Action"
 *   size="small"
 * >
 *   Are you sure you want to continue?
 * </Modal>
 * ```
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'medium',
  closeOnBackdrop = true,
  closeOnEsc = true,
  children,
  initialFocusRef,
  onAnimationComplete
}) => {
  // Portal container ref
  const portalRef = React.useRef<HTMLElement | null>(null);
  
  // Generate unique IDs for ARIA attributes
  const titleId = React.useId();
  const contentId = React.useId();

  // Set up animation and focus management
  const { isAnimating, animationClass } = useModalAnimation(isOpen, onAnimationComplete);
  const { focusTrapOptions } = useModalFocus(isOpen, onClose, closeOnEsc, initialFocusRef);

  // Create portal container if needed
  React.useEffect(() => {
    if (!portalRef.current) {
      const element = document.createElement('div');
      element.setAttribute('id', 'modal-root');
      document.body.appendChild(element);
      portalRef.current = element;
    }

    return () => {
      if (portalRef.current?.parentElement) {
        portalRef.current.parentElement.removeChild(portalRef.current);
      }
    };
  }, []);

  // Don't render if not open and not animating
  if (!isOpen && !isAnimating) {
    return null;
  }

  // Size-specific classes following 8px grid
  const sizeClasses = {
    small: 'w-[480px] max-w-[90vw]',
    medium: 'w-[640px] max-w-[90vw]',
    large: 'w-[800px] max-w-[90vw]'
  };

  const modal = (
    <FocusTrap
      active={isOpen}
      {...focusTrapOptions}
    >
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <div 
          className={clsx(
            'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity',
            isOpen ? 'animate-fade-in' : 'animate-fade-out'
          )}
          onClick={closeOnBackdrop ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Modal container */}
        <div className="min-h-full flex items-center justify-center p-4">
          <div
            className={clsx(
              'relative bg-white rounded-lg shadow-xl transform-gpu',
              sizeClasses[size],
              animationClass
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={contentId}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 
                id={titleId}
                className="text-lg font-medium text-gray-900 select-none"
              >
                {title}
              </h2>
              <Button
                variant="ghost"
                size="small"
                onClick={onClose}
                aria-label="Close modal"
                data-modal-fallback-focus
              >
                <Icon 
                  name={IconName.CLOSE}
                  size={16}
                  className="text-gray-400"
                />
              </Button>
            </div>

            {/* Content */}
            <div
              id={contentId}
              className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </FocusTrap>
  );

  return portalRef.current ? createPortal(modal, portalRef.current) : null;
};

/**
 * Error boundary for production resilience
 */
class ModalErrorBoundary extends React.Component<
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
      return null; // Fail gracefully in production
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary
export default React.memo(function WrappedModal(props: ModalProps) {
  return (
    <ModalErrorBoundary>
      <Modal {...props} />
    </ModalErrorBoundary>
  );
});