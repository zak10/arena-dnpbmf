import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import DashboardLayout from '../../layouts/DashboardLayout';
import ProposalDetail from '../../components/proposals/ProposalDetail';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { acceptProposal, rejectProposal } from '../../store/proposals/proposalsSlice';
import { ProposalStatus } from '../../types/proposals';
import { DataClassification } from '../../types/common';
import { ROUTES } from '../../constants/routes';

/**
 * Enhanced ProposalDetails page component with security controls and audit logging
 */
const ProposalDetailsPage: React.FC = () => {
  // Hooks
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showSuccess, showError } = useNotification();
  const { user, isAuthenticated } = useAuth();

  // Local state
  const [isUpdating, setIsUpdating] = useState(false);

  // Security check for authenticated access
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.AUTH.LOGIN, { 
        replace: true,
        state: { from: location.pathname }
      });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handles secure proposal status updates with audit logging
   */
  const handleStatusUpdate = useCallback(async (newStatus: ProposalStatus) => {
    if (!id || !user || isUpdating) return;

    setIsUpdating(true);

    try {
      // Generate audit metadata
      const auditMetadata = {
        userId: user.id,
        timestamp: new Date().toISOString(),
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent,
        action: `Proposal ${newStatus.toLowerCase()}`
      };

      // Dispatch appropriate action based on status
      if (newStatus === ProposalStatus.ACCEPTED) {
        await dispatch(acceptProposal({ 
          id,
          reason: 'Proposal accepted by reviewer',
          metadata: auditMetadata
        })).unwrap();
        
        showSuccess('Proposal accepted successfully', {
          autoDismiss: true,
          dismissTimeout: 5000
        });
      } else if (newStatus === ProposalStatus.REJECTED) {
        await dispatch(rejectProposal({
          id,
          reason: 'Proposal rejected by reviewer',
          metadata: auditMetadata
        })).unwrap();

        showSuccess('Proposal rejected successfully', {
          autoDismiss: true,
          dismissTimeout: 5000
        });
      }

      // Navigate back to proposals list after successful update
      navigate(ROUTES.PROPOSALS.LIST);

    } catch (error) {
      showError({
        code: 'E3001',
        message: 'Failed to update proposal status',
        details: { error },
        severity: 'ERROR'
      });
    } finally {
      setIsUpdating(false);
    }
  }, [id, user, isUpdating, dispatch, navigate, showSuccess, showError]);

  /**
   * Handles secure navigation back to proposals list
   */
  const handleBackClick = useCallback(() => {
    navigate(ROUTES.PROPOSALS.LIST);
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBackClick}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            aria-label="Back to proposals list"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Proposals
          </button>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-lg shadow">
          <ProposalDetail
            proposalId={id}
            onStatusUpdate={handleStatusUpdate}
            securityLevel={DataClassification.SENSITIVE}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

// Export wrapped component with error boundary
export default React.memo(ProposalDetailsPage);