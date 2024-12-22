/**
 * @fileoverview A React component that displays a software evaluation request in a card format
 * with enhanced accessibility and responsive design features.
 * @version 1.0.0
 */

// @version react@18.0.0
import React, { useCallback, memo } from 'react';
// @version classnames@2.3.0
import classNames from 'classnames';
import { Card, CardProps } from '../common/Card';
import { RequestStatus } from './RequestStatus';
import { Request } from '../../types/requests';
import { toDisplayDate } from '../../utils/date';

/**
 * Props interface for RequestCard component with enhanced accessibility support
 */
export interface RequestCardProps {
  /** Request data to display in card format */
  request: Request;
  /** Optional additional CSS classes for custom styling */
  className?: string;
  /** Click handler for card interaction with keyboard support */
  onClick?: () => void;
  /** Optional ARIA label for improved accessibility */
  ariaLabel?: string;
}

// Constants for component configuration
const REQUIREMENTS_PREVIEW_LENGTH = 150;
const CARD_TRANSITION_CLASSES = 'transition-all duration-200 ease-in-out';
const HOVER_CLASSES = 'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600';
const FOCUS_CLASSES = 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';

/**
 * Memoized function to truncate requirements text with word boundary preservation
 */
const truncateRequirements = useCallback((text: string, length: number): string => {
  if (text.length <= length) return text;
  
  const truncated = text.slice(0, length).split(' ').slice(0, -1).join(' ');
  return `${truncated}...`;
}, []);

/**
 * RequestCard component displays a software evaluation request in a card format
 * with accessibility features, responsive design, and theme support.
 *
 * @example
 * ```tsx
 * <RequestCard
 *   request={requestData}
 *   onClick={() => handleRequestClick(requestData.id)}
 *   className="my-4"
 * />
 * ```
 */
export const RequestCard = memo<RequestCardProps>(({
  request,
  className,
  onClick,
  ariaLabel
}) => {
  const {
    id,
    status,
    requirementsText,
    documents,
    createdAt
  } = request;

  // Format creation date with timezone support
  const formattedDate = toDisplayDate(createdAt);

  // Truncate requirements text for preview
  const truncatedRequirements = truncateRequirements(requirementsText, REQUIREMENTS_PREVIEW_LENGTH);

  // Combine CSS classes for styling
  const cardClasses = classNames(
    'relative',
    CARD_TRANSITION_CLASSES,
    HOVER_CLASSES,
    FOCUS_CLASSES,
    className
  );

  return (
    <Card
      className={cardClasses}
      interactive={Boolean(onClick)}
      onClick={onClick}
      ariaLabel={ariaLabel || `Request from ${formattedDate}`}
      role="article"
    >
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Request ID: {id.slice(0, 8)}
          </span>
          <RequestStatus status={status} />
        </div>
        <time
          dateTime={createdAt}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {formattedDate}
        </time>
      </div>

      {/* Requirements Preview */}
      <div className="mb-4">
        <h3 className="text-base font-medium mb-2 text-gray-900 dark:text-gray-100">
          Requirements
        </h3>
        <p
          className="text-sm text-gray-700 dark:text-gray-300"
          title={requirementsText.length > REQUIREMENTS_PREVIEW_LENGTH ? requirementsText : undefined}
        >
          {truncatedRequirements}
        </p>
      </div>

      {/* Footer Section */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Documents:
          </span>
          <span className="inline-flex items-center justify-center w-6 h-6 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full">
            {documents.length}
          </span>
        </div>
        
        {onClick && (
          <span
            className="text-sm text-primary-600 dark:text-primary-400"
            aria-hidden="true"
          >
            View Details →
          </span>
        )}
      </div>
    </Card>
  );
});

// Display name for debugging
RequestCard.displayName = 'RequestCard';

// Default export
export default RequestCard;