// @version react@18.0.0
import React, { useCallback } from 'react';
// @version date-fns@2.30.0
import { format } from 'date-fns';
// @version react-i18next@13.0.0
import { useTranslation } from 'react-i18next';
import { Card } from '../common/Card';
import { ProposalStatus } from './ProposalStatus';
import type { Proposal } from '../../types/proposals';

/**
 * Props interface for the ProposalCard component
 */
export interface ProposalCardProps {
  /** Proposal data to display */
  proposal: Proposal;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional click handler with proposal data */
  onClick?: (proposal: Proposal) => void;
  /** Optional keyboard event handler for accessibility */
  onKeyPress?: (event: React.KeyboardEvent, proposal: Proposal) => void;
  /** Optional tab index for keyboard navigation */
  tabIndex?: number;
}

/**
 * Formats the proposal price with currency symbol, billing frequency, and localization
 */
const formatPrice = (
  pricing: Proposal['pricing'],
  locale: string,
  currency: string = 'USD'
): string => {
  if (!pricing) return '—';

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    const basePrice = formatter.format(pricing.basePrice);
    
    // Add billing frequency if not one-time payment
    const frequency = pricing.billingFrequency.toLowerCase();
    return frequency === 'one_time' ? basePrice : `${basePrice}/${frequency}`;
  } catch (error) {
    console.error('Price formatting error:', error);
    return `$${pricing.basePrice}`;
  }
};

/**
 * ProposalCard component displays a proposal in a card format with enhanced
 * accessibility and internationalization support.
 *
 * Features:
 * - Responsive design following 8px grid system
 * - WCAG 2.1 AA compliant with proper ARIA attributes
 * - Keyboard navigation support
 * - Internationalized content and date formatting
 * - Dark mode support through Card component
 *
 * @example
 * ```tsx
 * <ProposalCard
 *   proposal={proposal}
 *   onClick={handleProposalClick}
 *   className="mb-4"
 * />
 * ```
 */
export const ProposalCard = React.memo<ProposalCardProps>(({
  proposal,
  className,
  onClick,
  onKeyPress,
  tabIndex = 0,
}) => {
  const { t, i18n } = useTranslation();
  
  // Memoize event handlers
  const handleClick = useCallback(() => {
    onClick?.(proposal);
  }, [onClick, proposal]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    onKeyPress?.(event, proposal);
  }, [onKeyPress, proposal]);

  // Format submission date with locale support
  const formattedDate = format(
    new Date(proposal.submittedAt),
    'PPp',
    { locale: i18n.language }
  );

  // Format price with locale support
  const formattedPrice = formatPrice(
    proposal.pricing,
    i18n.language
  );

  return (
    <Card
      className={className}
      hoverable
      interactive={!!onClick}
      onClick={handleClick}
      onKeyDown={handleKeyPress}
      tabIndex={tabIndex}
      ariaLabel={t('proposal.card.aria.label', {
        status: proposal.status,
        price: formattedPrice,
        date: formattedDate
      })}
      role="article"
    >
      <div className="flex flex-col gap-4">
        {/* Header with Status */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('proposal.card.title', { id: proposal.id })}
          </h3>
          <ProposalStatus status={proposal.status} />
        </div>

        {/* Price and Date Information */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('proposal.card.price')}
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formattedPrice}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('proposal.card.submitted')}
            </span>
            <time 
              dateTime={proposal.submittedAt}
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              {formattedDate}
            </time>
          </div>
        </div>

        {/* Document Count */}
        {proposal.documents.length > 0 && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('proposal.card.documents', {
              count: proposal.documents.length
            })}
          </div>
        )}
      </div>
    </Card>
  );
});

// Display name for debugging
ProposalCard.displayName = 'ProposalCard';

export default ProposalCard;