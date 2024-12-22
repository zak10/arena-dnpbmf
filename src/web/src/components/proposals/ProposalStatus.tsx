// @version react@18.0.0
import React from 'react';
// @version clsx@2.0.0
import clsx from 'clsx';

import { ProposalStatus as ProposalStatusEnum } from '../../types/proposals';
import { Badge, type BadgeProps } from '../common/Badge';

/**
 * Props interface for the ProposalStatus component
 */
export interface ProposalStatusProps {
  /** Current status of the proposal from the ProposalStatus enum */
  status: ProposalStatusEnum;
  /** Optional additional CSS classes for custom styling */
  className?: string;
}

/**
 * Configuration type for status visual properties
 */
interface StatusConfig {
  variant: BadgeProps['variant'];
  text: string;
  ariaLabel: string;
}

/**
 * Memoized mapping of proposal statuses to their visual and accessibility properties
 * Ensures consistent styling and messaging across the application
 */
const STATUS_CONFIG: Record<ProposalStatusEnum, StatusConfig> = {
  [ProposalStatusEnum.DRAFT]: {
    variant: 'default',
    text: 'Draft',
    ariaLabel: 'Proposal is in draft state',
  },
  [ProposalStatusEnum.SUBMITTED]: {
    variant: 'info',
    text: 'Submitted',
    ariaLabel: 'Proposal has been submitted',
  },
  [ProposalStatusEnum.UNDER_REVIEW]: {
    variant: 'warning',
    text: 'Under Review',
    ariaLabel: 'Proposal is under review',
  },
  [ProposalStatusEnum.ACCEPTED]: {
    variant: 'success',
    text: 'Accepted',
    ariaLabel: 'Proposal has been accepted',
  },
  [ProposalStatusEnum.REJECTED]: {
    variant: 'error',
    text: 'Rejected',
    ariaLabel: 'Proposal has been rejected',
  },
} as const;

/**
 * ProposalStatus component displays the current status of a proposal using a styled badge
 * with appropriate semantic colors and accessibility features.
 * 
 * Features:
 * - WCAG 2.1 AA compliant color contrast
 * - Screen reader support with descriptive labels
 * - Dark mode support through Badge component
 * - Consistent visual hierarchy using Tailwind CSS
 * 
 * @example
 * ```tsx
 * <ProposalStatus status={ProposalStatus.SUBMITTED} />
 * <ProposalStatus 
 *   status={ProposalStatus.ACCEPTED} 
 *   className="ml-2"
 * />
 * ```
 */
export const ProposalStatus = React.memo<ProposalStatusProps>(({
  status,
  className,
}) => {
  // Get the configuration for the current status
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant}
      className={clsx('font-medium', className)}
      ariaLabel={config.ariaLabel}
    >
      {config.text}
    </Badge>
  );
});

// Set display name for debugging purposes
ProposalStatus.displayName = 'ProposalStatus';

// Default export for convenient importing
export default ProposalStatus;