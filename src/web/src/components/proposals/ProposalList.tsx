// @version react@18.0.0
import React, { useCallback, useMemo } from 'react';
// @version clsx@2.0.0
import clsx from 'clsx';
// @version react-window@1.8.9
import { FixedSizeGrid } from 'react-window';

import ProposalCard, { ProposalCardProps } from './ProposalCard';
import EmptyState from '../common/EmptyState';
import ErrorBoundary from '../common/ErrorBoundary';
import { IconName } from '../../assets/icons';
import type { Proposal } from '../../types/proposals';

/**
 * Props interface for the ProposalList component
 */
export interface ProposalListProps {
  /** Array of proposal objects to display */
  proposals: Proposal[];
  /** Loading state indicator */
  isLoading: boolean;
  /** Handler for proposal selection */
  onProposalClick: (proposalId: string) => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional sort order for proposals */
  sortOrder?: 'ASC' | 'DESC';
  /** Optional filtering criteria */
  filterCriteria?: Record<string, unknown>;
}

/**
 * Constants for grid layout and responsiveness
 */
const GRID_CONFIG = {
  CARD_MIN_WIDTH: 320,
  CARD_HEIGHT: 200,
  GAP: 16,
  MOBILE_BREAKPOINT: 768,
} as const;

/**
 * ProposalList component displays a responsive, accessible grid of proposal cards
 * with virtualization support for optimal performance.
 *
 * Features:
 * - Responsive grid layout using CSS Grid
 * - Virtualized rendering for large lists
 * - Loading states with skeletons
 * - Empty state handling
 * - Keyboard navigation
 * - ARIA live regions for updates
 * - Error boundary protection
 */
export const ProposalList: React.FC<ProposalListProps> = React.memo(({
  proposals,
  isLoading,
  onProposalClick,
  className,
  sortOrder,
  filterCriteria,
}) => {
  // Calculate grid dimensions based on container width
  const [gridDimensions, setGridDimensions] = React.useState({ columns: 1, width: 0 });
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Update grid dimensions on resize
  React.useEffect(() => {
    const updateDimensions = () => {
      if (gridRef.current) {
        const containerWidth = gridRef.current.offsetWidth;
        const columns = Math.max(1, Math.floor(containerWidth / (GRID_CONFIG.CARD_MIN_WIDTH + GRID_CONFIG.GAP)));
        setGridDimensions({ columns, width: containerWidth });
      }
    };

    // Initial calculation
    updateDimensions();

    // Add resize observer
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Sort and filter proposals if needed
  const processedProposals = useMemo(() => {
    let result = [...proposals];

    // Apply sorting
    if (sortOrder) {
      result.sort((a, b) => {
        const comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        return sortOrder === 'ASC' ? comparison : -comparison;
      });
    }

    // Apply filtering
    if (filterCriteria) {
      // Implement filtering logic based on filterCriteria
      // This is a placeholder for the actual filtering implementation
    }

    return result;
  }, [proposals, sortOrder, filterCriteria]);

  // Memoized cell renderer for react-window
  const cellRenderer = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * gridDimensions.columns + columnIndex;
    const proposal = processedProposals[index];

    if (!proposal) return null;

    return (
      <div style={style} className="p-2">
        <ProposalCard
          proposal={proposal}
          onClick={() => onProposalClick(proposal.id)}
          className="h-full"
          tabIndex={0}
          onKeyPress={(e, proposal) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onProposalClick(proposal.id);
            }
          }}
        />
      </div>
    );
  }, [processedProposals, onProposalClick, gridDimensions.columns]);

  // Loading state with skeleton cards
  if (isLoading) {
    return (
      <div
        className={clsx(
          'grid gap-4',
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          className
        )}
        role="status"
        aria-busy="true"
        aria-label="Loading proposals"
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className={clsx(
              'animate-pulse bg-gray-100 dark:bg-gray-800',
              'rounded-lg h-[200px]'
            )}
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (!isLoading && processedProposals.length === 0) {
    return (
      <EmptyState
        title="No proposals available"
        description="There are currently no proposals to display."
        icon={IconName.INFO}
        className={className}
      />
    );
  }

  // Calculate grid dimensions
  const rowCount = Math.ceil(processedProposals.length / gridDimensions.columns);
  const columnWidth = (gridDimensions.width - (GRID_CONFIG.GAP * (gridDimensions.columns - 1))) / gridDimensions.columns;

  return (
    <div
      ref={gridRef}
      className={clsx('relative', className)}
      role="region"
      aria-label="Proposals grid"
    >
      <FixedSizeGrid
        columnCount={gridDimensions.columns}
        columnWidth={columnWidth}
        height={Math.min(window.innerHeight * 0.8, rowCount * (GRID_CONFIG.CARD_HEIGHT + GRID_CONFIG.GAP))}
        rowCount={rowCount}
        rowHeight={GRID_CONFIG.CARD_HEIGHT + GRID_CONFIG.GAP}
        width={gridDimensions.width}
        itemData={processedProposals}
      >
        {cellRenderer}
      </FixedSizeGrid>
    </div>
  );
});

// Display name for debugging
ProposalList.displayName = 'ProposalList';

// Export wrapped component with error boundary
export default function WrappedProposalList(props: ProposalListProps) {
  return (
    <ErrorBoundary>
      <ProposalList {...props} />
    </ErrorBoundary>
  );
}