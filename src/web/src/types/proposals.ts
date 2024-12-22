/**
 * @fileoverview Proposal-related TypeScript type definitions and interfaces for Arena MVP
 * @version 1.0.0
 */

import type { 
  ApiResponse, 
  PaginatedResponse, 
  FileUpload, 
  DataClassification 
} from './common';
import type { 
  Vendor, 
  VendorPricing 
} from './vendors';

/**
 * Enumeration of possible proposal statuses with comprehensive lifecycle tracking
 */
export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

/**
 * Enhanced interface for proposal document metadata with security classification
 * and integrity checks
 */
export interface ProposalDocument {
  readonly id: string;
  readonly name: string;
  readonly fileType: string;
  readonly sizeBytes: number;
  readonly url: string;
  readonly securityClassification: DataClassification;
  readonly uploadedBy: string;
  readonly uploadedAt: string;
  readonly checksum: string; // For document integrity verification
}

/**
 * Interface for tracking proposal changes and maintaining audit trail
 */
export interface ProposalAudit {
  readonly id: string;
  readonly proposalId: string;
  readonly action: string;
  readonly performedBy: string;
  readonly timestamp: string;
  readonly changes: Record<string, unknown>;
}

/**
 * Enhanced core proposal data interface with versioning and audit support
 */
export interface Proposal {
  readonly id: string;
  readonly requestId: string;
  readonly vendorId: string;
  readonly status: ProposalStatus;
  readonly pricing: VendorPricing;
  readonly vendorPitch: string;
  readonly documents: readonly ProposalDocument[];
  readonly version: number; // For version control
  readonly submittedAt: string;
  readonly updatedAt: string;
  readonly lastModifiedBy: string;
  readonly auditTrail: readonly ProposalAudit[];
}

/**
 * Type for paginated proposal list responses
 */
export type ProposalListResponse = PaginatedResponse<Proposal>;

/**
 * Type for single proposal responses
 */
export type ProposalResponse = ApiResponse<Proposal>;

/**
 * Constants for proposal validation and security
 */
export const MAX_PITCH_LENGTH = 5000;
export const MAX_PROPOSAL_DOCUMENTS = 10;
export const ALLOWED_PROPOSAL_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
export const PROPOSAL_RETENTION_DAYS = 730; // 2 years retention period

/**
 * Type guard to check if a proposal contains sensitive information
 */
export const containsSensitiveInfo = (proposal: Proposal): boolean => {
  return proposal.documents.some(
    doc => doc.securityClassification === DataClassification.HIGHLY_SENSITIVE ||
           doc.securityClassification === DataClassification.SENSITIVE
  );
};

/**
 * Type guard to check if a proposal is in a terminal state
 */
export const isProposalTerminal = (status: ProposalStatus): boolean => {
  return status === ProposalStatus.ACCEPTED || 
         status === ProposalStatus.REJECTED;
};