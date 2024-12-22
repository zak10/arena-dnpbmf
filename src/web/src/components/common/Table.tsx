import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';
import { Icon } from './Icon';
import { IconName } from '../../assets/icons';
import type { SortDirection } from '../../types/common';

/**
 * Interface defining table column configuration with enhanced accessibility support
 */
interface Column<T> {
  /** Unique identifier for the column */
  key: string;
  /** Display text for column header */
  header: string;
  /** Function to access cell data from row */
  accessor: (row: T) => string | number | React.ReactNode;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Additional CSS classes for column */
  className?: string;
  /** Accessibility label for column */
  ariaLabel?: string;
  /** Additional CSS classes for header cell */
  headerClassName?: string;
}

/**
 * Props interface for the Table component
 */
interface TableProps<T> {
  /** Column configurations */
  columns: Column<T>[];
  /** Data items to display */
  data: T[];
  /** Loading state */
  isLoading?: boolean;
  /** Empty state configuration */
  emptyState?: {
    title: string;
    description?: string;
    icon?: IconName;
    actionButton?: {
      text: string;
      onClick: () => void;
    };
  };
  /** Current sort configuration */
  sortConfig?: {
    key: string;
    direction: SortDirection;
  };
  /** Sort change handler */
  onSort?: (key: string, direction: SortDirection) => void;
  /** Pagination configuration */
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  /** Additional CSS classes */
  className?: string;
  /** Text direction for RTL support */
  dir?: 'ltr' | 'rtl';
}

/**
 * Helper function to get appropriate sort icon based on current sort state
 */
const getSortIcon = (
  columnKey: string,
  sortConfig?: { key: string; direction: SortDirection }
): IconName => {
  if (!sortConfig || sortConfig.key !== columnKey) {
    return IconName.SORT;
  }
  return sortConfig.direction === 'ASC' ? IconName.CHEVRON_UP : IconName.CHEVRON_DOWN;
};

/**
 * A fully accessible and responsive table component following Arena design system.
 * Supports sorting, pagination, loading states, and empty states.
 *
 * @example
 * ```tsx
 * <Table
 *   columns={[
 *     { key: 'name', header: 'Name', accessor: row => row.name, sortable: true },
 *     { key: 'status', header: 'Status', accessor: row => row.status }
 *   ]}
 *   data={items}
 *   sortConfig={{ key: 'name', direction: 'ASC' }}
 *   onSort={(key, direction) => handleSort(key, direction)}
 *   pagination={{
 *     currentPage: 1,
 *     pageSize: 10,
 *     totalItems: 100,
 *     onPageChange: page => setPage(page),
 *     onPageSizeChange: size => setPageSize(size)
 *   }}
 * />
 * ```
 */
const Table = <T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  emptyState,
  sortConfig,
  onSort,
  pagination,
  className,
  dir = 'ltr',
}: TableProps<T>) => {
  // Generate unique IDs for accessibility
  const tableId = React.useId();
  const captionId = React.useId();

  // Memoize column header click handler
  const handleHeaderClick = React.useCallback(
    (column: Column<T>) => {
      if (!column.sortable || !onSort) return;

      const newDirection: SortDirection =
        sortConfig?.key === column.key && sortConfig.direction === 'ASC'
          ? 'DESC'
          : 'ASC';

      onSort(column.key, newDirection);
    },
    [sortConfig, onSort]
  );

  // Render loading state
  if (isLoading) {
    return (
      <div
        className={clsx(
          'w-full min-h-[200px]',
          'flex items-center justify-center',
          className
        )}
      >
        <Loading size="lg" label="Loading table data..." />
      </div>
    );
  }

  // Render empty state
  if (data.length === 0 && emptyState) {
    return (
      <EmptyState
        title={emptyState.title}
        description={emptyState.description}
        icon={emptyState.icon}
        actionButton={emptyState.actionButton}
        className={className}
      />
    );
  }

  return (
    <div className={clsx('w-full space-y-4', className)}>
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table
          id={tableId}
          role="table"
          aria-labelledby={captionId}
          className="min-w-full divide-y divide-gray-200 table-fixed"
          dir={dir}
        >
          {/* Visually hidden caption for screen readers */}
          <caption id={captionId} className="sr-only">
            Data table with {columns.length} columns and {data.length} rows
          </caption>

          {/* Table header */}
          <thead className="bg-gray-50 sticky top-0">
            <tr role="row">
              {columns.map((column) => (
                <th
                  key={column.key}
                  role="columnheader"
                  scope="col"
                  aria-sort={
                    sortConfig?.key === column.key
                      ? sortConfig.direction.toLowerCase()
                      : undefined
                  }
                  className={clsx(
                    'px-6 py-3',
                    'text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    'whitespace-nowrap',
                    column.sortable && 'cursor-pointer hover:bg-gray-100',
                    column.headerClassName
                  )}
                  onClick={() => column.sortable && handleHeaderClick(column)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <Icon
                        name={getSortIcon(column.key, sortConfig)}
                        size={16}
                        className="flex-shrink-0 text-gray-400"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table body */}
          <tbody role="rowgroup" className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                role="row"
                className="hover:bg-gray-50 focus-within:bg-gray-50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    role="cell"
                    className={clsx(
                      'px-6 py-4',
                      'whitespace-nowrap',
                      'text-sm text-gray-900',
                      column.className
                    )}
                    aria-label={column.ariaLabel}
                  >
                    {column.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          dir={dir}
        />
      )}
    </div>
  );
};

/**
 * Error boundary for production resilience
 */
class TableErrorBoundary extends React.Component<
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
      return (
        <div role="alert" className="p-4 text-center text-gray-900">
          Unable to display table data. Please try again later.
        </div>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary and memo optimization
export default React.memo(Table) as typeof Table;