/**
 * @fileoverview A React component for displaying request status badges with accessibility and theme support
 * @version 1.0.0
 */

// @version react@18.0.0
import React from 'react';
import { RequestStatus as RequestStatusEnum } from '../../types/requests';
import { Badge, BadgeProps } from '../common/Badge';

/**
 * Props interface for RequestStatus component
 */
export interface RequestStatusProps {
  /** Current status of the request from RequestStatus enum */
  status: RequestStatusEnum;
  /** Optional additional CSS classes for custom styling */
  className?: string;
}

/**
 * Configuration for status badge variants with semantic colors, labels, and accessibility
 */
const STATUS_CONFIG = {
  [RequestStatusEnum.DRAFT]: {
    variant: 'default' as BadgeProps['variant'],
    label: 'Draft',
    ariaLabel: 'Request in draft state',
    icon: '✎', // pencil icon
    animation: 'opacity-75 hover:opacity-100 transition-opacity'
  },
  [RequestStatusEnum.PENDING]: {
    variant: 'warning' as BadgeProps['variant'],
    label: 'Pending',
    ariaLabel: 'Request pending review',
    icon: '⏲', // clock icon
    animation: 'animate-pulse'
  },
  [RequestStatusEnum.PROCESSING]: {
    variant: 'info' as BadgeProps['variant'],
    label: 'Processing',
    ariaLabel: 'Request being processed',
    icon: '↻', // spinner icon
    animation: 'animate-spin'
  },
  [RequestStatusEnum.COMPLETED]: {
    variant: 'success' as BadgeProps['variant'],
    label: 'Completed',
    ariaLabel: 'Request completed',
    icon: '✓', // check icon
    animation: 'transform hover:scale-105 transition-transform'
  }
} as const;

/**
 * RequestStatus component displays the current status of a request using an accessible,
 * theme-aware badge with semantic colors and appropriate animations.
 * 
 * Meets WCAG 2.1 Level AA compliance with proper ARIA labels and reduced motion support.
 *
 * @example
 * ```tsx
 * <RequestStatus status={RequestStatus.PROCESSING} />
 * <RequestStatus status={RequestStatus.COMPLETED} className="my-2" />
 * ```
 */
export const RequestStatus: React.FC<RequestStatusProps> = ({ status, className }) => {
  // Get configuration for current status
  const config = STATUS_CONFIG[status];

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Determine animation class based on motion preference
  const animationClass = prefersReducedMotion ? '' : config.animation;

  return (
    <Badge
      variant={config.variant}
      size="md"
      className={`inline-flex items-center gap-1.5 ${animationClass} ${className || ''}`}
      ariaLabel={config.ariaLabel}
    >
      <span className="select-none" aria-hidden="true">
        {config.icon}
      </span>
      {config.label}
    </Badge>
  );
};

// Default export for convenient importing
export default RequestStatus;