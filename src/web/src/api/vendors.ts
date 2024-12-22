/**
 * @fileoverview Vendor API client module for Arena MVP frontend
 * @version 1.0.0
 * 
 * Implements secure vendor data fetching, filtering, and management operations
 * with comprehensive error handling, rate limiting, and request correlation.
 */

import { AxiosResponse } from 'axios'; // v1.4.0
import { retry } from 'axios-retry'; // v3.5.0
import apiClient from './config';
import { 
  Vendor, 
  VendorListResponse, 
  VendorResponse, 
  VendorStatus,
  VendorCapabilities 
} from '../types/vendors';
import { parseApiError } from '../utils/error';
import { ErrorSeverity } from '../types/common';

// API endpoint constants
const VENDORS_ENDPOINT = '/vendors';
const DEFAULT_PAGE_SIZE = 20;
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 5000;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Fetches paginated list of vendors with enhanced security and error handling
 * 
 * @param params - Query parameters for vendor list request
 * @returns Promise resolving to paginated vendor list
 * @throws ErrorResponse with appropriate severity and code
 */
export async function getVendors(params?: {
  page?: number;
  limit?: number;
  status?: VendorStatus;
  correlationId?: string;
}): Promise<VendorListResponse> {
  try {
    // Input validation
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || DEFAULT_PAGE_SIZE));

    // Configure request with security headers and correlation ID
    const config = {
      params: {
        page,
        limit,
        status: params?.status,
      },
      headers: {
        'X-Correlation-ID': params?.correlationId || crypto.randomUUID(),
        'Cache-Control': 'no-store',
      },
      timeout: REQUEST_TIMEOUT,
    };

    // Make request with retry logic
    const response = await apiClient.get<VendorListResponse>(
      VENDORS_ENDPOINT,
      config
    );

    // Validate response structure
    if (!response.data || !Array.isArray(response.data.items)) {
      throw new Error('Invalid vendor list response structure');
    }

    return response.data;
  } catch (error) {
    throw parseApiError(error, 'ERROR');
  }
}

/**
 * Fetches a single vendor by ID with enhanced validation
 * 
 * @param id - Vendor ID to fetch
 * @param correlationId - Optional request correlation ID
 * @returns Promise resolving to vendor details
 * @throws ErrorResponse with appropriate severity and code
 */
export async function getVendorById(
  id: string,
  correlationId?: string
): Promise<VendorResponse> {
  try {
    // Validate vendor ID format
    if (!id.match(/^[a-zA-Z0-9-]+$/)) {
      throw new Error('Invalid vendor ID format');
    }

    // Configure request with security headers
    const config = {
      headers: {
        'X-Correlation-ID': correlationId || crypto.randomUUID(),
        'Cache-Control': 'no-store',
      },
      timeout: REQUEST_TIMEOUT,
    };

    // Make request with retry logic
    const response = await apiClient.get<VendorResponse>(
      `${VENDORS_ENDPOINT}/${id}`,
      config
    );

    // Validate response data integrity
    if (!response.data || !response.data.data.id) {
      throw new Error('Invalid vendor response structure');
    }

    return response.data;
  } catch (error) {
    throw parseApiError(error, 'ERROR');
  }
}

/**
 * Filters vendors by capabilities with input validation
 * 
 * @param capabilities - Required vendor capabilities
 * @param params - Optional query parameters
 * @returns Promise resolving to filtered vendor list
 * @throws ErrorResponse with appropriate severity and code
 */
export async function getVendorsByCapability(
  capabilities: string[],
  params?: {
    page?: number;
    limit?: number;
    correlationId?: string;
  }
): Promise<VendorListResponse> {
  try {
    // Validate capabilities array
    if (!Array.isArray(capabilities) || capabilities.length === 0) {
      throw new Error('Invalid capabilities filter');
    }

    // Sanitize capabilities input
    const sanitizedCapabilities = capabilities.map(cap => 
      encodeURIComponent(cap.trim())
    );

    // Configure request parameters
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || DEFAULT_PAGE_SIZE));

    // Configure request with security headers
    const config = {
      params: {
        page,
        limit,
        capabilities: sanitizedCapabilities.join(','),
      },
      headers: {
        'X-Correlation-ID': params?.correlationId || crypto.randomUUID(),
        'Cache-Control': 'no-store',
      },
      timeout: REQUEST_TIMEOUT,
    };

    // Make request with retry logic
    const response = await apiClient.get<VendorListResponse>(
      `${VENDORS_ENDPOINT}/filter`,
      config
    );

    // Validate response structure
    if (!response.data || !Array.isArray(response.data.items)) {
      throw new Error('Invalid vendor list response structure');
    }

    return response.data;
  } catch (error) {
    throw parseApiError(error, 'ERROR');
  }
}

// Configure retry logic for vendor API requests
retry(apiClient, {
  retries: MAX_RETRIES,
  retryDelay: (retryCount) => {
    return Math.min(1000 * Math.pow(2, retryCount), 10000);
  },
  retryCondition: (error) => {
    return (
      !error.response ||
      error.response.status >= 500 ||
      error.response.status === 429
    );
  },
});

export default {
  getVendors,
  getVendorById,
  getVendorsByCapability,
};