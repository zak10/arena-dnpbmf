// @floating-ui/react v0.24.0
// react v18.0.0
// clsx v1.2.1

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useFloating,
  autoUpdate,
  offset as floatingOffset,
  flip,
  shift,
  arrow,
  Placement,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import clsx from 'clsx';

export interface TooltipProps {
  /**
   * Content to display in the tooltip
   */
  content: React.ReactNode;
  
  /**
   * Element that triggers the tooltip
   */
  children: React.ReactElement;
  
  /**
   * Preferred tooltip placement with RTL awareness
   * @default 'top'
   */
  placement?: Placement;
  
  /**
   * Delay in ms before showing tooltip
   * @default 200
   */
  delay?: number;
  
  /**
   * Distance between tooltip and trigger element following 8px grid
   * @default 8
   */
  offset?: number;
  
  /**
   * Custom ID for ARIA attributes
   */
  id?: string;
}

/**
 * Custom hook managing tooltip state, positioning, and interactions
 */
const useTooltip = ({
  placement = 'top',
  offset = 8,
  delay = 200,
  id,
}: Partial<TooltipProps>) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef<HTMLDivElement>(null);

  // Setup floating-ui positioning with RTL support
  const {
    x,
    y,
    strategy,
    refs,
    context,
    placement: finalPlacement,
    middlewareData: { arrow: { x: arrowX, y: arrowY } = {} },
  } = useFloating({
    placement,
    middleware: [
      floatingOffset(offset),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Setup interactions (hover, focus, dismiss)
  const hover = useHover(context, { delay });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  // Merge all interactions
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // Handle touch device interactions
  useEffect(() => {
    const handleTouchStart = () => setIsOpen(false);
    
    if (typeof window !== 'undefined') {
      document.addEventListener('touchstart', handleTouchStart);
      return () => document.removeEventListener('touchstart', handleTouchStart);
    }
  }, []);

  // Generate unique ID for ARIA attributes
  const tooltipId = id || `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  return {
    isOpen,
    x,
    y,
    strategy,
    refs,
    arrowRef,
    arrowX,
    arrowY,
    finalPlacement,
    tooltipId,
    getReferenceProps,
    getFloatingProps,
  };
};

/**
 * A reusable tooltip component that provides contextual information with
 * accessibility features, RTL support, and touch device handling.
 */
const Tooltip: React.FC<TooltipProps> = React.memo(({
  content,
  children,
  placement = 'top',
  delay = 200,
  offset = 8,
  id,
}) => {
  const {
    isOpen,
    x,
    y,
    strategy,
    refs,
    arrowRef,
    arrowX,
    arrowY,
    finalPlacement,
    tooltipId,
    getReferenceProps,
    getFloatingProps,
  } = useTooltip({ placement, offset, delay, id });

  // Clone trigger element to add ref and aria attributes
  const trigger = React.cloneElement(children, {
    ref: refs.setReference,
    'aria-describedby': isOpen ? tooltipId : undefined,
    ...getReferenceProps(),
  });

  return (
    <>
      {trigger}
      <FloatingPortal>
        {isOpen && (
          <div
            ref={refs.setFloating}
            id={tooltipId}
            role="tooltip"
            className={clsx(
              // Base styles
              'bg-gray-900 text-white text-sm px-2 py-1 rounded shadow-lg max-w-xs z-50',
              // Transitions
              'transition-opacity duration-200',
              // States
              isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            )}
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              width: 'max-content',
            }}
            {...getFloatingProps()}
          >
            {content}
            <div
              ref={arrowRef}
              className="absolute w-2 h-2 bg-gray-900 rotate-45"
              style={{
                top: arrowY != null ? arrowY : '',
                left: arrowX != null ? arrowX : '',
                [finalPlacement.includes('top') ? 'bottom' : 'top']: '-4px',
                [finalPlacement.includes('left') ? 'right' : 'left']: 
                  finalPlacement.includes('left') || finalPlacement.includes('right')
                    ? '-4px'
                    : '',
              }}
            />
          </div>
        )}
      </FloatingPortal>
    </>
  );
});

Tooltip.displayName = 'Tooltip';

export default Tooltip;