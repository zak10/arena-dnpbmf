import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';

import DashboardLayout from '../../layouts/DashboardLayout';
import ProposalComparison from '../../components/proposals/ProposalComparison';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import Loading from '../../components/common/Loading';

import { proposalsThunks } from '../../store/proposals/proposalsSlice';
import { useAuth } from '../../hooks/useAuth';
import { parseApiError } from '../../utils/error';
import type { ErrorResponse } from '../../types/common';
import type { CompareProposalsProps } from '../../types/proposals';

/**
 * Page component for comparing vendor proposals with enhanced security and accessibility.
 * Implements side-by-side comparison with standardized metrics and secure proposal actions.
 */
const CompareProposals: React.FC<CompareProposalsProps> = ({ className }) => {
  const dispatch = useDispatch();
  const { requestId } = useParams<{ requestId: string }>();
  const { user, isAuthenticated } = useAuth();

  // Redux state selectors
  const proposals = useSelector(state => state.proposals.items);
  const loading = useSelector(state => state.proposals.loading.fetch);
  const error = useSelector(state => state.proposals.error);

  // Fetch proposals on component mount
  useEffect(() => {
    if (requestId && isAuthenticated) {
      dispatch(proposalsThunks.fetchProposals({ 
        requestId,
        page: 1,
        pageSize: 10
      }));
    }
  }, [dispatch, requestId, isAuthenticated]);

  // Handle proposal acceptance with audit logging
  const handleAcceptProposal = useCallback(async (proposalId: string) => {
    try {
      await dispatch(proposalsThunks.acceptProposal({
        id: proposalId,
        reason: 'Proposal accepted after comparison review',
        metadata: {
          userId: user?.id,
          timestamp: new Date().toISOString(),
          action: 'ACCEPT_FROM_COMPARISON'
        }
      })).unwrap();
    } catch (error) {
      const parsedError = parseApiError(error);
      throw new Error(parsedError.message);
    }
  }, [dispatch, user]);

  // Handle proposal rejection with audit logging
  const handleRejectProposal = useCallback(async (proposalId: string, reason: string) => {
    try {
      await dispatch(proposalsThunks.rejectProposal({
        id: proposalId,
        reason,
        metadata: {
          userId: user?.id,
          timestamp: new Date().toISOString(),
          action: 'REJECT_FROM_COMPARISON'
        }
      })).unwrap();
    } catch (error) {
      const parsedError = parseApiError(error);
      throw new Error(parsedError.message);
    }
  }, [dispatch, user]);

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <div 
          className={clsx(
            'container mx-auto px-4 py-8',
            'focus-within:outline-none',
            className
          )}
        >
          <h1 
            className="text-2xl font-bold mb-6"
            tabIndex={-1}
          >
            Compare Proposals
          </h1>

          {loading === 'LOADING' && (
            <div className="flex justify-center py-12" role="status">
              <Loading size="lg" label="Loading proposals..." />
            </div>
          )}

          {error && (
            <div 
              role="alert" 
              className="text-red-600 bg-red-50 p-4 rounded-md mb-6"
              aria-live="polite"
            >
              <p className="font-medium">Error loading proposals</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          )}

          {!loading && !error && proposals.length > 0 && (
            <ProposalComparison
              proposals={proposals}
              onAccept={handleAcceptProposal}
              onReject={handleRejectProposal}
              dataClassification={user?.role === 'ARENA_STAFF' ? 'SENSITIVE' : 'PUBLIC'}
            />
          )}

          {!loading && !error && proposals.length === 0 && (
            <div 
              className="text-center py-12 text-gray-500"
              role="status"
              aria-live="polite"
            >
              No proposals available for comparison.
            </div>
          )}
        </div>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default React.memo(CompareProposals);