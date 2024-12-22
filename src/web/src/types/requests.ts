/**
 * @fileoverview TypeScript type definitions and interfaces for software evaluation requests
 * @version 1.0.0
 */

import { BaseModel, DataClassification } from '../types/common';

/**
 * Maximum length for requirements text input
 */
export const MAX_REQUIREMENTS_LENGTH = 10000;

/**
 * Maximum number of documents that can be uploaded per request
 */
export const MAX_DOCUMENTS = 5;

/**
 * Allowed MIME types for document uploads
 */
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const;

/**
 * Enumerated status values for request processing lifecycle
 */
export enum RequestStatus {
  DRAFT = 'DRAFT',           // Initial state when request is being created
  PENDING = 'PENDING',       // Submitted but not yet processed
  PROCESSING = 'PROCESSING', // Currently being processed by AI
  COMPLETED = 'COMPLETED'    // Processing finished, ready for vendor matching
}

/**
 * Interface for uploaded supporting documents with enhanced security features
 */
export interface RequestDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  securityClassification: DataClassification;
  uploadedBy: string;
  checksum: string; // For file integrity verification
}

/**
 * Main interface for software evaluation requests with audit trail
 * Extends BaseModel to inherit common fields (id, createdAt, updatedAt)
 */
export interface Request extends BaseModel {
  status: RequestStatus;
  requirementsText: string;
  parsedRequirements: Record<string, any>; // AI-parsed structured requirements
  documents: RequestDocument[];
  lastModifiedBy: string;  // For audit trail
  version: number;        // For optimistic concurrency control
}

/**
 * Interface for request creation payload
 * Omits system-generated fields that are set on the backend
 */
export interface CreateRequestPayload {
  requirementsText: string;
  documents: File[];
}

/**
 * Interface for request update payload
 * Similar to create payload but used for updates
 */
export interface UpdateRequestPayload {
  requirementsText: string;
  documents: File[];
}

/**
 * Type for single request API response
 */
export type RequestResponse = {
  data: Request;
};

/**
 * Type for paginated request list API response
 */
export type RequestListResponse = {
  items: Request[];
  total: number;
  page: number;
  pageSize: number;
};