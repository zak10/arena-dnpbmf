import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import ProposalList from '../../components/proposals/ProposalList';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { fetchProposals } from '../../store/proposals/proposalsSlice';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { ProposalStatus } from '../../types/proposals';
import { PAGINATION } from '../../constants/common';
import { Button } from '../../components/common/Button';
import { IconName } from '../../assets/icons';

/**
 * Proposals page component that displays a paginated, filterable list of proposals
 * with enhanced accessibility and performance optimizations.
 */
const Proposals: React.FC = () => {
  // Redux hooks
  const dispatch = useDispatch();
  const { proposals, loading, error, pagination } = useSelector(
    (state: any) => state.proposals
  );

  // Router hooks
  const navigate = useNavigate();

  // Auth hook for role-based access
  const { isAuthenticated, isBuyer } = useAuth();

  // Local state for filters and sorting
  const [filters, setFilters] = useState({
    status: [] as ProposalStatus[],
    dateRange: {
      start: '',
      end: ''
    }
  });
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch proposals on mount and when filters change
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchProposals({
        page: currentPage,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
        filters,
        sortOrder
      }));
    }
  }, [dispatch, isAuthenticated, currentPage, filters, sortOrder]);

  // Handle proposal click navigation
  const handleProposalClick = useCallback((proposalId: string) => {
    navigate(ROUTES.PROPOSALS.DETAILS.replace(':id', proposalId));
  }, [navigate]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  // Handle sort order change
  const handleSortChange = useCallback(() => {
    setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Proposals
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {pagination.total} total proposals
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                leftIcon={IconName.FILTER}
                onClick={() => {/* Open filter modal */}}
                aria-label="Filter proposals"
              >
                Filter
              </Button>
              <Button
                variant="secondary"
                leftIcon={IconName.SORT}
                onClick={handleSortChange}
                aria-label={`Sort by date ${sortOrder === 'ASC' ? 'ascending' : 'descending'}`}
              >
                Sort
              </Button>
            </div>
          </div>

          {/* Filter Tags */}
          {filters.status.length > 0 && (
            <div className="flex flex-wrap gap-2" role="list" aria-label="Active filters">
              {filters.status.map(status => (
                <Button
                  key={status}
                  variant="outline"
                  size="small"
                  rightIcon={IconName.CLOSE}
                  onClick={() => {
                    handleFilterChange({
                      ...filters,
                      status: filters.status.filter(s => s !== status)
                    });
                  }}
                  aria-label={`Remove ${status} filter`}
                >
                  {status}
                </Button>
              ))}
            </div>
          )}

          {/* Proposals List */}
          <ProposalList
            proposals={proposals}
            isLoading={loading === 'LOADING'}
            onProposalClick={handleProposalClick}
            sortOrder={sortOrder}
            filterCriteria={filters}
            className="mt-6"
          />

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div
              className="flex justify-center mt-8"
              role="navigation"
              aria-label="Pagination"
            >
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                leftIcon={IconName.CHEVRON_LEFT}
                aria-label="Previous page"
              >
                Previous
              </Button>
              <span className="mx-4 flex items-center">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                rightIcon={IconName.CHEVRON_RIGHT}
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default Proposals;