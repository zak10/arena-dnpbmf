import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { Button } from './Button';
import { IconName } from '../../assets/icons';
import type { PaginatedResponse } from '../../types/common';

// Constants for pagination configuration
const PAGE_SIZES = [10, 25, 50, 100] as const;
const MAX_VISIBLE_PAGES = 7;
const MIN_MOBILE_VISIBLE_PAGES = 3;
const MOBILE_BREAKPOINT = 768;

/**
 * Props interface for the Pagination component with enhanced accessibility and internationalization support
 */
interface PaginationProps {
  /** Current active page number (1-based) */
  currentPage: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Callback when page number changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;
  /** Additional CSS classes to apply */
  className?: string;
  /** Text direction for internationalization support */
  dir?: 'ltr' | 'rtl';
}

/**
 * Generates array of page numbers to display with ellipsis, optimized for mobile view
 */
const getPageNumbers = (
  currentPage: number,
  totalPages: number,
  isMobile: boolean
): number[] => {
  const visiblePages = isMobile ? MIN_MOBILE_VISIBLE_PAGES : MAX_VISIBLE_PAGES;
  const pages: number[] = [];

  // Always show first page
  pages.push(1);

  // Calculate range around current page
  let rangeStart = Math.max(2, currentPage - Math.floor(visiblePages / 2));
  let rangeEnd = Math.min(totalPages - 1, rangeStart + visiblePages - 2);

  // Adjust range if at edges
  if (rangeEnd - rangeStart < visiblePages - 2) {
    rangeStart = Math.max(2, rangeEnd - visiblePages + 2);
  }

  // Add ellipsis and range numbers
  if (rangeStart > 2) pages.push(-1); // Left ellipsis
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }
  if (rangeEnd < totalPages - 1) pages.push(-1); // Right ellipsis

  // Always show last page if more than one page
  if (totalPages > 1) pages.push(totalPages);

  return pages;
};

/**
 * Generates accessible text showing current range and total items
 */
const getPageInfo = (
  currentPage: number,
  pageSize: number,
  totalItems: number,
  locale: string = 'en-US'
): string => {
  const start = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const end = Math.min(currentPage * pageSize, totalItems);
  
  const formatter = new Intl.NumberFormat(locale);
  
  return `Showing ${formatter.format(start)} to ${formatter.format(end)} of ${formatter.format(totalItems)} items`;
};

/**
 * A fully accessible pagination component following Arena design system.
 * Supports responsive design, keyboard navigation, and screen readers.
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   pageSize={10}
 *   totalItems={100}
 *   onPageChange={(page) => setPage(page)}
 *   onPageSizeChange={(size) => setPageSize(size)}
 * />
 * ```
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
  dir = 'ltr',
}) => {
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Media query for responsive design
  const [isMobile, setIsMobile] = React.useState(
    window.innerWidth < MOBILE_BREAKPOINT
  );

  // Update mobile state on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get visible page numbers
  const pageNumbers = React.useMemo(
    () => getPageNumbers(currentPage, totalPages, isMobile),
    [currentPage, totalPages, isMobile]
  );

  // Generate unique IDs for accessibility
  const labelId = React.useId();
  const comboboxId = React.useId();

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={clsx(
        'flex flex-col sm:flex-row items-center gap-4',
        className
      )}
      dir={dir}
    >
      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <label htmlFor={comboboxId} className="text-sm text-gray-700">
          Items per page:
        </label>
        <select
          id={comboboxId}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-md border-gray-300 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Current page information */}
      <p
        id={labelId}
        className="text-sm text-gray-700"
        aria-live="polite"
      >
        {getPageInfo(currentPage, pageSize, totalItems)}
      </p>

      {/* Page navigation */}
      <div className="flex items-center gap-2">
        {/* Previous page button */}
        <Button
          variant="outline"
          size="small"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          leftIcon={dir === 'ltr' ? IconName.CHEVRON_LEFT : IconName.CHEVRON_RIGHT}
          aria-label="Previous page"
        >
          {!isMobile && 'Previous'}
        </Button>

        {/* Page number buttons */}
        <div className="flex items-center gap-2">
          {pageNumbers.map((pageNum, index) => 
            pageNum === -1 ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-gray-500"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === currentPage ? 'primary' : 'outline'}
                size="small"
                onClick={() => onPageChange(pageNum)}
                aria-current={pageNum === currentPage ? 'page' : undefined}
                aria-label={`Page ${pageNum}`}
              >
                {pageNum}
              </Button>
            )
          )}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="small"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          rightIcon={dir === 'ltr' ? IconName.CHEVRON_RIGHT : IconName.CHEVRON_LEFT}
          aria-label="Next page"
        >
          {!isMobile && 'Next'}
        </Button>
      </div>
    </nav>
  );
};

export default React.memo(Pagination);