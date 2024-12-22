/**
 * @fileoverview Redux slice for managing software evaluation request state
 * @version 1.0.0
 * 
 * Implements request state management with caching, pagination, and optimistic updates
 * based on technical specifications section 3.1 and 3.2
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'; // v1.9.5
import { Request, RequestStatus, RequestListResponse } from '../../types/requests';
import { getRequests, getRequest, createRequest, updateRequest } from '../../api/requests';
import { ErrorResponse } from '../../types/common';
import { parseApiError } from '../../utils/error';

// Cache duration from technical specifications (5 minutes)
const CACHE_VALIDITY_DURATION = 5 * 60 * 1000;

// Interface for request state with caching and pagination
interface RequestsState {
  items: Request[];
  currentRequest: Request | null;
  loading: boolean;
  error: ErrorResponse | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  cache: {
    lastUpdated: number | null;
    requests: Record<string, Request>;
    validityDuration: number;
  };
}

// Initial state based on technical specifications
const initialState: RequestsState = {
  items: [],
  currentRequest: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0
  },
  cache: {
    lastUpdated: null,
    requests: {},
    validityDuration: CACHE_VALIDITY_DURATION
  }
};

/**
 * Async thunk for fetching paginated requests with caching
 */
export const fetchRequests = createAsyncThunk<
  RequestListResponse,
  {
    page?: number;
    pageSize?: number;
    status?: RequestStatus;
    forceRefresh?: boolean;
  }
>(
  'requests/fetchRequests',
  async (params, { rejectWithValue, getState }) => {
    try {
      const { requests } = getState() as { requests: RequestsState };
      const { lastUpdated, validityDuration } = requests.cache;

      // Check cache validity if not forcing refresh
      if (
        !params.forceRefresh &&
        lastUpdated &&
        Date.now() - lastUpdated < validityDuration
      ) {
        return {
          items: requests.items,
          total: requests.pagination.total,
          page: requests.pagination.page,
          pageSize: requests.pagination.pageSize
        };
      }

      const response = await getRequests({
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        status: params.status
      });

      return response;
    } catch (error) {
      throw rejectWithValue(parseApiError(error));
    }
  }
);

/**
 * Async thunk for fetching single request with cache support
 */
export const fetchRequest = createAsyncThunk<
  Request,
  string,
  { rejectValue: ErrorResponse }
>(
  'requests/fetchRequest',
  async (requestId, { rejectWithValue, getState }) => {
    try {
      const { requests } = getState() as { requests: RequestsState };
      const cachedRequest = requests.cache.requests[requestId];

      // Return cached request if valid
      if (
        cachedRequest &&
        requests.cache.lastUpdated &&
        Date.now() - requests.cache.lastUpdated < requests.cache.validityDuration
      ) {
        return cachedRequest;
      }

      const response = await getRequest(requestId);
      return response;
    } catch (error) {
      throw rejectWithValue(parseApiError(error));
    }
  }
);

/**
 * Async thunk for creating new request with optimistic update
 */
export const submitRequest = createAsyncThunk<
  Request,
  { requirementsText: string; documents: File[] },
  { rejectValue: ErrorResponse }
>(
  'requests/submitRequest',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createRequest(payload);
      return response;
    } catch (error) {
      throw rejectWithValue(parseApiError(error));
    }
  }
);

/**
 * Async thunk for updating request with optimistic update
 */
export const updateRequestThunk = createAsyncThunk<
  Request,
  { id: string; requirementsText?: string; documents?: File[] },
  { rejectValue: ErrorResponse }
>(
  'requests/updateRequest',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await updateRequest(payload.id, {
        requirementsText: payload.requirementsText,
        documents: payload.documents
      });
      return response;
    } catch (error) {
      throw rejectWithValue(parseApiError(error));
    }
  }
);

// Create the requests slice
const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentRequest: (state) => {
      state.currentRequest = null;
    },
    invalidateCache: (state) => {
      state.cache.lastUpdated = null;
      state.cache.requests = {};
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchRequests
      .addCase(fetchRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = {
          page: action.payload.page,
          pageSize: action.payload.pageSize,
          total: action.payload.total
        };
        state.cache.lastUpdated = Date.now();
        // Update cache with new items
        action.payload.items.forEach(request => {
          state.cache.requests[request.id] = request;
        });
      })
      .addCase(fetchRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ErrorResponse;
      })
      // Handle fetchRequest
      .addCase(fetchRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRequest = action.payload;
        state.cache.requests[action.payload.id] = action.payload;
        state.cache.lastUpdated = Date.now();
      })
      .addCase(fetchRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ErrorResponse;
      })
      // Handle submitRequest
      .addCase(submitRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.cache.requests[action.payload.id] = action.payload;
        state.cache.lastUpdated = Date.now();
        state.pagination.total += 1;
      })
      .addCase(submitRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ErrorResponse;
      })
      // Handle updateRequest
      .addCase(updateRequestThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRequestThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map(item =>
          item.id === action.payload.id ? action.payload : item
        );
        state.currentRequest = action.payload;
        state.cache.requests[action.payload.id] = action.payload;
        state.cache.lastUpdated = Date.now();
      })
      .addCase(updateRequestThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ErrorResponse;
      });
  }
});

// Export actions
export const { clearError, clearCurrentRequest, invalidateCache } = requestsSlice.actions;

// Memoized selectors
export const selectRequests = createSelector(
  [(state: { requests: RequestsState }) => state.requests],
  (requests) => ({
    items: requests.items,
    pagination: requests.pagination,
    loading: requests.loading,
    error: requests.error
  })
);

export const selectCurrentRequest = createSelector(
  [(state: { requests: RequestsState }) => state.requests],
  (requests) => ({
    request: requests.currentRequest,
    loading: requests.loading,
    error: requests.error
  })
);

export const selectRequestsByStatus = createSelector(
  [
    (state: { requests: RequestsState }) => state.requests.items,
    (_: any, status: RequestStatus) => status
  ],
  (items, status) => items.filter(item => item.status === status)
);

// Export reducer
export default requestsSlice.reducer;