/**
 * @fileoverview Main page component for displaying and managing software evaluation requests
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestList, RequestListProps } from '../../components/requests/RequestList';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectRequests, fetchRequests } from '../../store/requests/requestsSlice';
import { IconName } from '../../assets/icons';
import { RequestStatus } from '../../types/requests';
import { toDisplayDate } from '../../utils/date';

/**
 * Props interface for the Requests page component
 */
interface RequestsPageProps {}

/**
 * Main page component for displaying and managing software evaluation requests.
 * Implements paginated list view with filtering and enhanced error handling.
 */
const RequestsPage: React.FC<RequestsPageProps> = React.memo(() => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, pagination, loading, error } = useAppSelector(selectRequests);

  // Memoized status filter options
  const statusOptions = useMemo(() => [
    { label: 'All', value: '' },
    { label: 'Draft', value: RequestStatus.DRAFT },
    { label: 'Pending', value: RequestStatus.PENDING },
    { label: 'Processing', value: RequestStatus.PROCESSING },
    { label: 'Completed', value: RequestStatus.COMPLETED }
  ], []);

  /**
   * Handles page change with validation and error handling
   */
  const handlePageChange = useCallback((page: number) => {
    if (page < 1) return;
    dispatch(fetchRequests({ 
      page,
      pageSize: pagination.pageSize 
    }));
  }, [dispatch, pagination.pageSize]);

  /**
   * Handles page size changes with proper state updates
   */
  const handlePageSizeChange = useCallback((pageSize: number) => {
    dispatch(fetchRequests({ 
      page: 1,
      pageSize 
    }));
  }, [dispatch]);

  /**
   * Handles request selection and navigation
   */
  const handleRequestClick = useCallback((requestId: string) => {
    navigate(`/requests/${requestId}`);
  }, [navigate]);

  /**
   * Handles retry attempts for failed requests
   */
  const handleRetry = useCallback(() => {
    dispatch(fetchRequests({
      page: pagination.page,
      pageSize: pagination.pageSize
    }));
  }, [dispatch, pagination]);

  /**
   * Fetch initial data on mount with cleanup
   */
  useEffect(() => {
    const controller = new AbortController();
    
    dispatch(fetchRequests({
      page: 1,
      pageSize: pagination.pageSize
    }));

    return () => {
      controller.abort();
    };
  }, [dispatch, pagination.pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Software Evaluation Requests
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and track your software evaluation requests
          </p>
        </div>
        
        <button
          onClick={() => navigate('/requests/new')}
          className="btn-primary inline-flex items-center px-4 py-2 rounded-md"
          aria-label="Create new request"
        >
          <span className="mr-2">New Request</span>
          <span aria-hidden="true">+</span>
        </button>
      </div>

      {/* Request List with Error Boundary */}
      <ErrorBoundary>
        <RequestList
          requests={{
            items,
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total
          }}
          isLoading={loading}
          error={error}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onRequestClick={handleRequestClick}
          onRetry={handleRetry}
          className="mt-4"
          virtualizeList={items.length > 20}
        />
      </ErrorBoundary>
    </div>
  );
});

// Display name for debugging
RequestsPage.displayName = 'RequestsPage';

// Export wrapped component with error boundary
export default function WrappedRequestsPage(props: RequestsPageProps) {
  return (
    <ErrorBoundary>
      <RequestsPage {...props} />
    </ErrorBoundary>
  );
}