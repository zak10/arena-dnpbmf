/**
 * @fileoverview A React component that displays a paginated list of software evaluation requests
 * with enhanced accessibility, responsive design, and optimized performance features.
 * @version 1.0.0
 */

// @version react@18.0.0
import React, { useCallback, useEffect, useMemo } from 'react';
// @version clsx@2.3.0
import clsx from 'clsx';
// @version react-intersection-observer@9.0.0
import { useIntersectionObserver } from 'react-intersection-observer';

// Internal imports
import RequestCard, { RequestCardProps } from './RequestCard';
import EmptyState from '../common/EmptyState';
import Loading from '../common/Loading';
import Pagination from '../common/Pagination';
import ErrorBoundary from '../common/ErrorBoundary';
import { IconName } from '../../assets/icons';
import type { PaginatedResponse } from '../../types/common';
import type { Request } from '../../types/requests';

/**
 * Props interface for RequestList component with enhanced accessibility and performance options
 */
export interface RequestListProps {
  /** Paginated request data to display */
  requests: PaginatedResponse<Request>;
  /** Loading state indicator */
  isLoading: boolean;
  /** Error state for failed requests */
  error: Error | null;
  /** Page change handler */
  onPageChange: (page: number) => void;
  /** Page size change handler */
  onPageSizeChange: (pageSize: number) => void;
  /** Request selection handler */
  onRequestClick: (requestId: string) => void;
  /** Error retry handler */
  onRetry: () => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Enable list virtualization for performance */
  virtualizeList?: boolean;
  /** Text direction for RTL support */
  dir?: 'ltr' | 'rtl';
}

/**
 * Grid layout configuration following 8px grid system
 */
const GRID_CONFIG = {
  gap: 'gap-4', // 16px gap
  cols: {
    default: 'grid-cols-1',
    md: 'md:grid-cols-2',
    lg: 'lg:grid-cols-3'
  }
};

/**
 * RequestList component displays a paginated grid of software evaluation requests
 * with enhanced accessibility, responsive design, and performance optimizations.
 */
const RequestList: React.FC<RequestListProps> = ({
  requests,
  isLoading,
  error,
  onPageChange,
  onPageSizeChange,
  onRequestClick,
  onRetry,
  className,
  virtualizeList = false,
  dir = 'ltr'
}) => {
  // Intersection observer for infinite scroll optimization
  const { ref, inView } = useIntersectionObserver({
    threshold: 0.5,
    triggerOnce: true
  });

  // Memoized grid classes for performance
  const gridClasses = useMemo(() => 
    clsx(
      'grid',
      GRID_CONFIG.gap,
      GRID_CONFIG.cols.default,
      GRID_CONFIG.cols.md,
      GRID_CONFIG.cols.lg,
      'min-h-[200px]'
    ),
    []
  );

  // Handle keyboard navigation between cards
  const handleKeyNavigation = useCallback((event: KeyboardEvent) => {
    const cards = document.querySelectorAll('[role="article"]');
    const currentIndex = Array.from(cards).findIndex(
      card => card === document.activeElement
    );

    switch (event.key) {
      case 'ArrowRight':
        if (currentIndex < cards.length - 1) {
          (cards[currentIndex + 1] as HTMLElement).focus();
        }
        break;
      case 'ArrowLeft':
        if (currentIndex > 0) {
          (cards[currentIndex - 1] as HTMLElement).focus();
        }
        break;
      case 'ArrowUp':
        if (currentIndex >= 2) {
          (cards[currentIndex - 2] as HTMLElement).focus();
        }
        break;
      case 'ArrowDown':
        if (currentIndex + 2 < cards.length) {
          (cards[currentIndex + 2] as HTMLElement).focus();
        }
        break;
    }
  }, []);

  // Set up keyboard navigation
  useEffect(() => {
    document.addEventListener('keydown', handleKeyNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyNavigation);
    };
  }, [handleKeyNavigation]);

  // Handle error state
  if (error) {
    return (
      <div role="alert" className="p-4">
        <EmptyState
          title="Error loading requests"
          description={error.message}
          icon={IconName.ERROR}
          actionButton={{
            text: 'Retry',
            onClick: onRetry
          }}
        />
      </div>
    );
  }

  // Handle empty state
  if (!isLoading && requests.items.length === 0) {
    return (
      <EmptyState
        title="No requests found"
        description="Create your first software evaluation request to get started"
        icon={IconName.ADD}
        actionButton={{
          text: 'Create Request',
          onClick: () => onRequestClick('new')
        }}
      />
    );
  }

  return (
    <div
      className={clsx('flex flex-col space-y-4 relative', className)}
      dir={dir}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10"
          role="status"
          aria-label="Loading requests"
        >
          <Loading size="lg" />
        </div>
      )}

      {/* Request grid */}
      <div className={gridClasses}>
        {requests.items.map((request, index) => (
          <div
            key={request.id}
            ref={index === requests.items.length - 1 ? ref : undefined}
          >
            <RequestCard
              request={request}
              onClick={() => onRequestClick(request.id)}
              className="h-full"
              ariaLabel={`Request ${index + 1} of ${requests.items.length}`}
            />
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      <div className="mt-4 border-t border-gray-200 sticky bottom-0 bg-white dark:bg-gray-800">
        <Pagination
          currentPage={requests.page}
          pageSize={requests.pageSize}
          totalItems={requests.total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          dir={dir}
        />
      </div>
    </div>
  );
};

// Wrap with error boundary and memo for performance
export default React.memo(function WrappedRequestList(props: RequestListProps) {
  return (
    <ErrorBoundary>
      <RequestList {...props} />
    </ErrorBoundary>
  );
});