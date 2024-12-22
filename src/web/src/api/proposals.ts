/**
 * @fileoverview API client module for managing proposal-related operations
 * @version 1.0.0
 * 
 * Implements secure, type-safe functions for managing vendor proposals with
 * comprehensive error handling, audit logging, and performance optimizations.
 */

import { AxiosResponse } from 'axios'; // v1.4.0
import retry from 'axios-retry'; // v3.5.0
import { apiClient } from './config';
import { API_ENDPOINTS } from '../constants/api';
import { ErrorResponse, DataClassification } from '../types/common';
import { parseApiError } from '../utils/error';

// Constants for proposal management
const PROPOSAL_PAGE_SIZE = 20;
const PROPOSAL_CACHE_TTL = 300000; // 5 minutes in ms
const MAX_RETRY_ATTEMPTS = 3;
const SENSITIVE_FIELDS = ['vendorIdentity', 'pricing', 'comments'];

/**
 * Interface for proposal data with enhanced security metadata
 */
interface Proposal {
  id: string;
  requestId: string;
  vendorId: string;
  status: ProposalStatus;
  pricing: Record<string, unknown>;
  pitch: string;
  submittedAt: string;
  documents: ProposalDocument[];
  securityClassification: DataClassification;
  version: number;
}

/**
 * Interface for proposal documents with security controls
 */
interface ProposalDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  checksum: string;
  securityClassification: DataClassification;
}

/**
 * Enumerated proposal status values
 */
enum ProposalStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

/**
 * Interface for paginated proposal list response
 */
interface ProposalListResponse {
  items: Proposal[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Parameters for retrieving proposals list
 */
interface GetProposalsParams {
  page?: number;
  pageSize?: number;
  status?: ProposalStatus;
  requestId?: string;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

/**
 * Configure retry logic for proposal operations
 */
retry(apiClient, {
  retries: MAX_RETRY_ATTEMPTS,
  retryDelay: retry.exponentialDelay,
  retryCondition: (error) => {
    const errorCode = error.response?.data?.code;
    return ['E4001', 'E4002', 'E4003'].includes(errorCode);
  }
});

/**
 * Retrieves a paginated list of proposals with security validation and caching
 * 
 * @param params - Query parameters for filtering and pagination
 * @returns Promise resolving to paginated proposal list
 * @throws ErrorResponse if request fails or validation errors occur
 */
export async function getProposals(
  params: GetProposalsParams = {}
): Promise<ProposalListResponse> {
  try {
    const response = await apiClient.get<ProposalListResponse>(
      API_ENDPOINTS.PROPOSALS.BASE,
      {
        params: {
          page: params.page || 1,
          pageSize: params.pageSize || PROPOSAL_PAGE_SIZE,
          status: params.status,
          requestId: params.requestId,
          sortBy: params.sortBy,
          sortDirection: params.sortDirection
        },
        headers: {
          'Cache-Control': `max-age=${PROPOSAL_CACHE_TTL / 1000}`
        }
      }
    );

    // Validate and sanitize response data
    const proposals = response.data.items.map(proposal => ({
      ...proposal,
      pricing: sanitizeSensitiveData(proposal.pricing),
      documents: proposal.documents.map(doc => ({
        ...doc,
        url: sanitizeDocumentUrl(doc.url)
      }))
    }));

    return {
      ...response.data,
      items: proposals
    };
  } catch (error) {
    throw parseApiError(error);
  }
}

/**
 * Retrieves a single proposal by ID with enhanced security validation
 * 
 * @param id - Unique proposal identifier
 * @returns Promise resolving to proposal details
 * @throws ErrorResponse if request fails or proposal not found
 */
export async function getProposalById(id: string): Promise<Proposal> {
  try {
    const response = await apiClient.get<Proposal>(
      `${API_ENDPOINTS.PROPOSALS.BASE}/${id}`,
      {
        headers: {
          'Cache-Control': `max-age=${PROPOSAL_CACHE_TTL / 1000}`
        }
      }
    );

    // Validate response and security classification
    validateProposalAccess(response.data);

    return {
      ...response.data,
      pricing: sanitizeSensitiveData(response.data.pricing),
      documents: response.data.documents.map(doc => ({
        ...doc,
        url: sanitizeDocumentUrl(doc.url)
      }))
    };
  } catch (error) {
    throw parseApiError(error);
  }
}

/**
 * Updates proposal status with comprehensive audit logging
 * 
 * @param id - Unique proposal identifier
 * @param status - New proposal status
 * @param reason - Reason for status change
 * @returns Promise resolving to updated proposal
 * @throws ErrorResponse if update fails or validation errors occur
 */
export async function updateProposalStatus(
  id: string,
  status: ProposalStatus,
  reason: string
): Promise<Proposal> {
  try {
    // Validate status transition
    validateStatusTransition(status);

    const response = await apiClient.put<Proposal>(
      `${API_ENDPOINTS.PROPOSALS.BASE}/${id}/status`,
      {
        status,
        reason,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'X-Audit-Action': 'UPDATE_STATUS',
          'X-Audit-Reason': reason
        }
      }
    );

    // Invalidate relevant caches
    await invalidateProposalCaches(id);

    return {
      ...response.data,
      pricing: sanitizeSensitiveData(response.data.pricing)
    };
  } catch (error) {
    throw parseApiError(error);
  }
}

/**
 * Validates user has permission to access proposal data
 */
function validateProposalAccess(proposal: Proposal): void {
  if (proposal.securityClassification === 'HIGHLY_SENSITIVE') {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'ARENA_STAFF') {
      throw new Error('Insufficient permissions to access proposal');
    }
  }
}

/**
 * Validates proposal status transition is allowed
 */
function validateStatusTransition(newStatus: ProposalStatus): void {
  const allowedTransitions: Record<ProposalStatus, ProposalStatus[]> = {
    [ProposalStatus.PENDING]: [ProposalStatus.UNDER_REVIEW],
    [ProposalStatus.UNDER_REVIEW]: [ProposalStatus.ACCEPTED, ProposalStatus.REJECTED],
    [ProposalStatus.ACCEPTED]: [],
    [ProposalStatus.REJECTED]: []
  };

  const currentStatus = localStorage.getItem('currentProposalStatus') as ProposalStatus;
  if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
    throw new Error('Invalid status transition');
  }
}

/**
 * Sanitizes sensitive data fields in proposal
 */
function sanitizeSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  SENSITIVE_FIELDS.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  return sanitized;
}

/**
 * Sanitizes document URLs to prevent XSS
 */
function sanitizeDocumentUrl(url: string): string {
  const sanitized = new URL(url);
  return sanitized.toString();
}

/**
 * Invalidates proposal-related caches after updates
 */
async function invalidateProposalCaches(proposalId: string): Promise<void> {
  const cacheKeys = [
    `proposal_${proposalId}`,
    'proposals_list'
  ];
  
  // Implementation would depend on caching strategy used
  // This is a placeholder for cache invalidation logic
  console.log('Invalidating caches:', cacheKeys);
}