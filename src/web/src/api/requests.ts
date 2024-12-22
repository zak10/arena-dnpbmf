/**
 * @fileoverview API client module for software evaluation request operations
 * @version 1.0.0
 * 
 * Implements secure request management with caching, retry logic, and 
 * comprehensive error handling based on technical specifications.
 */

import { apiClient } from './config';
import { API_ENDPOINTS } from '../constants/api';
import { Request, RequestStatus, CreateRequestPayload, RequestListResponse } from '../types/requests';
import { debounce } from 'lodash'; // v4.17.21
import axiosRetry from 'axios-retry'; // v3.5.0

// Constants based on technical specifications
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

// In-memory request cache
interface RequestCache {
  data: RequestListResponse;
  timestamp: number;
  params: string;
}

const requestCache = new Map<string, RequestCache>();

/**
 * Validates file size and type before upload
 */
function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File ${file.name} exceeds maximum size of 10MB`);
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not supported`);
  }
}

/**
 * Generates cache key from request parameters
 */
function generateCacheKey(params: Record<string, any>): string {
  return JSON.stringify(params);
}

/**
 * Checks if cached data is still valid
 */
function isCacheValid(cache: RequestCache): boolean {
  return Date.now() - cache.timestamp < CACHE_TTL;
}

/**
 * Fetches paginated list of software evaluation requests with caching
 */
export const getRequests = async (params: {
  page?: number;
  pageSize?: number;
  status?: RequestStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<RequestListResponse> => {
  const cacheKey = generateCacheKey(params);
  const cachedData = requestCache.get(cacheKey);

  // Return cached data if valid
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    const response = await apiClient.get<RequestListResponse>(
      API_ENDPOINTS.REQUESTS.BASE,
      {
        params: {
          page: params.page || 1,
          pageSize: params.pageSize || 10,
          status: params.status,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder || 'desc'
        }
      }
    );

    // Update cache with new data
    requestCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
      params: cacheKey
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a new software evaluation request with file upload support
 */
export const createRequest = async (payload: CreateRequestPayload): Promise<Request> => {
  // Validate all files before starting upload
  payload.documents?.forEach(validateFile);

  const formData = new FormData();
  formData.append('requirementsText', payload.requirementsText);

  // Add files to form data with progress tracking
  if (payload.documents) {
    for (const file of payload.documents) {
      formData.append('documents', file);
    }
  }

  // Configure axios-retry for reliable file uploads
  axiosRetry(apiClient, {
    retries: MAX_RETRIES,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
             error.code === 'E2003'; // File upload failed
    }
  });

  try {
    const response = await apiClient.post<Request>(
      API_ENDPOINTS.REQUESTS.BASE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 0)
          );
          // Emit upload progress event
          window.dispatchEvent(
            new CustomEvent('uploadProgress', {
              detail: { progress: percentCompleted }
            })
          );
        }
      }
    );

    // Invalidate cache after successful creation
    requestCache.clear();

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Debounced version of getRequests for search/filter operations
export const debouncedGetRequests = debounce(getRequests, 300);

/**
 * Updates an existing request
 */
export const updateRequest = async (
  requestId: string,
  payload: Partial<CreateRequestPayload>
): Promise<Request> => {
  try {
    // Validate any new files
    payload.documents?.forEach(validateFile);

    const formData = new FormData();
    
    if (payload.requirementsText) {
      formData.append('requirementsText', payload.requirementsText);
    }

    if (payload.documents) {
      for (const file of payload.documents) {
        formData.append('documents', file);
      }
    }

    const response = await apiClient.put<Request>(
      `${API_ENDPOINTS.REQUESTS.BASE}/${requestId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    // Invalidate cache after successful update
    requestCache.clear();

    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Retrieves a single request by ID
 */
export const getRequestById = async (requestId: string): Promise<Request> => {
  try {
    const response = await apiClient.get<Request>(
      `${API_ENDPOINTS.REQUESTS.BASE}/${requestId}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a request and its associated documents
 */
export const deleteRequest = async (requestId: string): Promise<void> => {
  try {
    await apiClient.delete(`${API_ENDPOINTS.REQUESTS.BASE}/${requestId}`);
    // Invalidate cache after successful deletion
    requestCache.clear();
  } catch (error) {
    throw error;
  }
};