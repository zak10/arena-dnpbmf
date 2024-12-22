import React, { useEffect, useState, useCallback } from 'react'; // v18.0.0
import { useParams } from 'react-router-dom'; // v6.0.0
import Button from '../common/Button';
import ErrorBoundary from '../common/ErrorBoundary';
import { IconName } from '../../assets/icons';
import { ApiResponse, DataClassification, ErrorResponse, LoadingState } from '../../types/common';

/**
 * Security classification for proposal data handling
 */
enum SecurityClassification {
  PUBLIC = 'PUBLIC',
  SENSITIVE = 'SENSITIVE',
  HIGHLY_SENSITIVE = 'HIGHLY_SENSITIVE'
}

/**
 * Proposal status with audit requirements
 */
enum ProposalStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

/**
 * Interface for audit logging information
 */
interface AuditInfo {
  userId: string;
  action: string;
  timestamp: string;
  reason?: string;
  ipAddress: string;
}

/**
 * Interface for proposal document with security classification
 */
interface ProposalDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  securityClassification: DataClassification;
  uploadedAt: string;
}

/**
 * Interface for vendor proposal data
 */
interface ProposalData {
  id: string;
  vendorId: string;
  vendorName: string;
  status: ProposalStatus;
  pricing: {
    amount: number;
    currency: string;
    billingFrequency: string;
    includedUsers: number;
  };
  pitch: string;
  documents: ProposalDocument[];
  securityClassification: SecurityClassification;
  submittedAt: string;
  lastUpdatedAt: string;
}

/**
 * Props interface for ProposalDetail component
 */
interface ProposalDetailProps {
  proposalId?: string;
  onStatusUpdate?: (status: ProposalStatus, auditInfo: AuditInfo) => void;
  securityLevel?: SecurityClassification;
}

/**
 * Fetches proposal data with security checks
 */
const fetchProposalData = async (
  proposalId: string,
  securityLevel?: SecurityClassification
): Promise<ApiResponse<ProposalData>> => {
  const response = await fetch(`/api/v1/proposals/${proposalId}`, {
    headers: {
      'X-Security-Level': securityLevel || SecurityClassification.SENSITIVE,
      'X-Request-ID': crypto.randomUUID()
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch proposal data');
  }

  return response.json();
};

/**
 * ProposalDetail component displays detailed information about a vendor proposal
 * with enhanced security controls and comprehensive error handling.
 */
const ProposalDetail: React.FC<ProposalDetailProps> = ({
  proposalId: propProposalId,
  onStatusUpdate,
  securityLevel = SecurityClassification.SENSITIVE
}) => {
  // Get proposal ID from props or URL params
  const { id: urlProposalId } = useParams<{ id: string }>();
  const proposalId = propProposalId || urlProposalId;

  // Component state
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('IDLE');
  const [error, setError] = useState<ErrorResponse | null>(null);

  // Fetch proposal data with security checks
  const loadProposalData = useCallback(async () => {
    if (!proposalId) return;

    setLoadingState('LOADING');
    try {
      const response = await fetchProposalData(proposalId, securityLevel);
      setProposal(response.data);
      setLoadingState('SUCCEEDED');
    } catch (err) {
      setError({
        code: 'E3001',
        message: 'Failed to load proposal details',
        details: { error: err },
        severity: 'ERROR'
      });
      setLoadingState('FAILED');
    }
  }, [proposalId, securityLevel]);

  useEffect(() => {
    loadProposalData();
  }, [loadProposalData]);

  // Handle proposal status updates with audit logging
  const handleStatusUpdate = async (newStatus: ProposalStatus, reason?: string) => {
    if (!proposal || !onStatusUpdate) return;

    const auditInfo: AuditInfo = {
      userId: 'current-user-id', // Replace with actual user ID
      action: `Update proposal status to ${newStatus}`,
      timestamp: new Date().toISOString(),
      reason,
      ipAddress: window.location.hostname
    };

    try {
      await onStatusUpdate(newStatus, auditInfo);
      setProposal(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      setError({
        code: 'E3001',
        message: 'Failed to update proposal status',
        details: { error: err },
        severity: 'ERROR'
      });
    }
  };

  if (loadingState === 'LOADING') {
    return <div className="p-4">Loading proposal details...</div>;
  }

  if (loadingState === 'FAILED' || error) {
    return (
      <div className="p-4 text-red-600">
        {error?.message || 'An error occurred while loading the proposal'}
      </div>
    );
  }

  if (!proposal) {
    return <div className="p-4">No proposal found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{proposal.vendorName}</h1>
          <p className="text-gray-600">Submitted {new Date(proposal.submittedAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          {proposal.status === ProposalStatus.PENDING && (
            <>
              <Button
                variant="primary"
                leftIcon={IconName.CHECK}
                onClick={() => handleStatusUpdate(ProposalStatus.ACCEPTED)}
              >
                Accept
              </Button>
              <Button
                variant="outline"
                leftIcon={IconName.CLOSE}
                onClick={() => handleStatusUpdate(ProposalStatus.REJECTED)}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Pricing Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Pricing Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Amount</p>
            <p className="text-xl font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: proposal.pricing.currency
              }).format(proposal.pricing.amount)}
              /{proposal.pricing.billingFrequency}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Included Users</p>
            <p className="text-xl font-medium">{proposal.pricing.includedUsers}</p>
          </div>
        </div>
      </section>

      {/* Vendor Pitch */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Vendor Pitch</h2>
        <div className="prose max-w-none">
          {proposal.pitch}
        </div>
      </section>

      {/* Documents */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Documents</h2>
        <div className="space-y-2">
          {proposal.documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{doc.name}</span>
                {doc.securityClassification === 'HIGHLY_SENSITIVE' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                    Confidential
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="small"
                leftIcon={IconName.DOWNLOAD}
                onClick={() => window.open(doc.url, '_blank')}
              >
                Download
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// Wrap component with error boundary for production resilience
export default function WrappedProposalDetail(props: ProposalDetailProps) {
  return (
    <ErrorBoundary>
      <ProposalDetail {...props} />
    </ErrorBoundary>
  );
}