/**
 * @fileoverview Redux Toolkit slice for managing proposal state in Arena MVP
 * @version 1.0.0
 */

import { 
  createSlice, 
  createAsyncThunk, 
  createSelector,
  PayloadAction 
} from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { 
  Proposal, 
  ProposalStatus,
  ProposalListResponse,
  ProposalResponse,
  ProposalAudit 
} from '../../types/proposals';
import type { 
  ErrorResponse,
  LoadingState,
  ErrorCode 
} from '../../types/common';

// State interface with comprehensive tracking
interface ProposalsState {
  readonly items: Proposal[];
  readonly selectedProposal: Proposal | null;
  readonly loading: {
    readonly fetch: LoadingState;
    readonly accept: LoadingState;
    readonly reject: LoadingState;
  };
  readonly error: {
    readonly code: ErrorCode | null;
    readonly message: string | null;
    readonly details: Record<string, unknown> | null;
  };
  readonly pagination: {
    readonly totalCount: number;
    readonly currentPage: number;
    readonly pageSize: number;
    readonly totalPages: number;
  };
  readonly retryCount: number;
}

// Initial state with proper typing
const initialState: ProposalsState = {
  items: [],
  selectedProposal: null,
  loading: {
    fetch: 'IDLE',
    accept: 'IDLE',
    reject: 'IDLE'
  },
  error: {
    code: null,
    message: null,
    details: null
  },
  pagination: {
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    totalPages: 0
  },
  retryCount: 0
};

// Enhanced filter interface for proposal queries
interface ProposalFilters {
  status?: ProposalStatus[];
  vendorId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Async thunk for fetching proposals with retry logic
export const fetchProposals = createAsyncThunk<
  ProposalListResponse,
  { page: number; pageSize: number; filters?: ProposalFilters },
  { rejectValue: ErrorResponse }
>(
  'proposals/fetchProposals',
  async ({ page, pageSize, filters }, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(`/api/v1/proposals?page=${page}&pageSize=${pageSize}${
        filters ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : ''
      }`);
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue({
        code: 'E4003',
        message: 'Failed to fetch proposals',
        details: { error },
        severity: 'ERROR'
      });
    }
  }
);

// Async thunk for accepting proposals with audit logging
export const acceptProposal = createAsyncThunk<
  ProposalResponse,
  { id: string; reason: string; metadata?: Record<string, unknown> },
  { rejectValue: ErrorResponse }
>(
  'proposals/acceptProposal',
  async ({ id, reason, metadata }, { rejectWithValue }) => {
    try {
      const auditEntry: Partial<ProposalAudit> = {
        action: 'ACCEPT',
        changes: { status: ProposalStatus.ACCEPTED, reason, ...metadata }
      };

      const response = await fetch(`/api/v1/proposals/${id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, auditEntry })
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue({
        code: 'E3001',
        message: 'Failed to accept proposal',
        details: { error },
        severity: 'ERROR'
      });
    }
  }
);

// Async thunk for rejecting proposals with audit logging
export const rejectProposal = createAsyncThunk<
  ProposalResponse,
  { id: string; reason: string; metadata?: Record<string, unknown> },
  { rejectValue: ErrorResponse }
>(
  'proposals/rejectProposal',
  async ({ id, reason, metadata }, { rejectWithValue }) => {
    try {
      const auditEntry: Partial<ProposalAudit> = {
        action: 'REJECT',
        changes: { status: ProposalStatus.REJECTED, reason, ...metadata }
      };

      const response = await fetch(`/api/v1/proposals/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, auditEntry })
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue({
        code: 'E3001',
        message: 'Failed to reject proposal',
        details: { error },
        severity: 'ERROR'
      });
    }
  }
);

// Create the proposals slice with comprehensive state management
const proposalsSlice = createSlice({
  name: 'proposals',
  initialState,
  reducers: {
    resetProposals: (state) => {
      state.items = [];
      state.selectedProposal = null;
      state.error = initialState.error;
      state.pagination = initialState.pagination;
      state.retryCount = 0;
    },
    setSelectedProposal: (state, action: PayloadAction<Proposal | null>) => {
      state.selectedProposal = action.payload;
    },
    clearError: (state) => {
      state.error = initialState.error;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pagination.pageSize = action.payload;
      state.pagination.currentPage = 1; // Reset to first page
    }
  },
  extraReducers: (builder) => {
    // Fetch proposals reducers
    builder.addCase(fetchProposals.pending, (state) => {
      state.loading.fetch = 'LOADING';
      state.error = initialState.error;
    });
    builder.addCase(fetchProposals.fulfilled, (state, action) => {
      state.loading.fetch = 'SUCCEEDED';
      state.items = action.payload.items;
      state.pagination = {
        totalCount: action.payload.total,
        currentPage: action.payload.page,
        pageSize: action.payload.pageSize,
        totalPages: action.payload.totalPages
      };
      state.retryCount = 0;
    });
    builder.addCase(fetchProposals.rejected, (state, action) => {
      state.loading.fetch = state.retryCount < 3 ? 'RETRYING' : 'FAILED';
      if (action.payload) {
        state.error = {
          code: action.payload.code,
          message: action.payload.message,
          details: action.payload.details
        };
      }
      state.retryCount += 1;
    });

    // Accept proposal reducers
    builder.addCase(acceptProposal.pending, (state) => {
      state.loading.accept = 'LOADING';
      state.error = initialState.error;
    });
    builder.addCase(acceptProposal.fulfilled, (state, action) => {
      state.loading.accept = 'SUCCEEDED';
      const index = state.items.findIndex(p => p.id === action.payload.data.id);
      if (index !== -1) {
        state.items[index] = action.payload.data;
      }
      if (state.selectedProposal?.id === action.payload.data.id) {
        state.selectedProposal = action.payload.data;
      }
    });
    builder.addCase(acceptProposal.rejected, (state, action) => {
      state.loading.accept = 'FAILED';
      if (action.payload) {
        state.error = {
          code: action.payload.code,
          message: action.payload.message,
          details: action.payload.details
        };
      }
    });

    // Reject proposal reducers with similar pattern
    builder.addCase(rejectProposal.pending, (state) => {
      state.loading.reject = 'LOADING';
      state.error = initialState.error;
    });
    builder.addCase(rejectProposal.fulfilled, (state, action) => {
      state.loading.reject = 'SUCCEEDED';
      const index = state.items.findIndex(p => p.id === action.payload.data.id);
      if (index !== -1) {
        state.items[index] = action.payload.data;
      }
      if (state.selectedProposal?.id === action.payload.data.id) {
        state.selectedProposal = action.payload.data;
      }
    });
    builder.addCase(rejectProposal.rejected, (state, action) => {
      state.loading.reject = 'FAILED';
      if (action.payload) {
        state.error = {
          code: action.payload.code,
          message: action.payload.message,
          details: action.payload.details
        };
      }
    });
  }
});

// Export actions
export const { 
  resetProposals, 
  setSelectedProposal, 
  clearError, 
  setPageSize 
} = proposalsSlice.actions;

// Memoized selectors for optimized state access
export const selectProposals = (state: RootState) => state.proposals.items;
export const selectSelectedProposal = (state: RootState) => state.proposals.selectedProposal;
export const selectProposalsError = (state: RootState) => state.proposals.error;
export const selectProposalsLoading = (state: RootState) => state.proposals.loading;
export const selectProposalsPagination = (state: RootState) => state.proposals.pagination;

export const selectProposalById = createSelector(
  [selectProposals, (state: RootState, proposalId: string) => proposalId],
  (proposals, proposalId) => proposals.find(p => p.id === proposalId)
);

export const selectProposalsByStatus = createSelector(
  [selectProposals, (state: RootState, status: ProposalStatus) => status],
  (proposals, status) => proposals.filter(p => p.status === status)
);

// Export reducer
export default proposalsSlice.reducer;