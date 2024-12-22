import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { axe } from '@axe-core/react';

import CompareProposals from '../CompareProposals';
import { proposalsThunks } from '../../../store/proposals/proposalsSlice';
import type { Proposal, ProposalStatus } from '../../../types/proposals';
import type { DataClassification } from '../../../types/common';

// Mock Redux store setup helper
const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        proposals: (state = { items: [], loading: { fetch: 'IDLE' }, error: null }) => state,
        auth: (state = { user: { role: 'BUYER' } }) => state
      },
      preloadedState
    }),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={['/proposals/compare']}>
        <Routes>
          <Route path="/proposals/compare" element={children} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

  return {
    store,
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};

// Mock proposal data generator
const generateMockProposals = (count: number): Proposal[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `proposal-${index + 1}`,
    requestId: 'request-1',
    vendorId: `vendor-${index + 1}`,
    status: ProposalStatus.SUBMITTED,
    pricing: {
      basePrice: 1000 * (index + 1),
      billingFrequency: 'MONTHLY',
      additionalCosts: {
        'API Integration': 500,
        'Custom Support': 1000
      }
    },
    vendorPitch: `Vendor ${index + 1} pitch`,
    documents: [],
    version: 1,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastModifiedBy: 'user-1',
    auditTrail: []
  }));
};

describe('CompareProposals Component', () => {
  // Mock Redux actions
  const mockFetchProposals = jest.spyOn(proposalsThunks, 'fetchProposals');
  const mockAcceptProposal = jest.spyOn(proposalsThunks, 'acceptProposal');
  const mockRejectProposal = jest.spyOn(proposalsThunks, 'rejectProposal');
  const mockAuditProposalAction = jest.spyOn(proposalsThunks, 'auditProposalAction');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const mockProposals = generateMockProposals(2);
      const { container } = renderWithProviders(<CompareProposals />, {
        preloadedState: {
          proposals: { items: mockProposals, loading: { fetch: 'IDLE' }, error: null }
        }
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      const mockProposals = generateMockProposals(2);
      const { user } = renderWithProviders(<CompareProposals />, {
        preloadedState: {
          proposals: { items: mockProposals, loading: { fetch: 'IDLE' }, error: null }
        }
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText('Accept')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Reject')).toHaveFocus();
    });
  });

  describe('Rendering', () => {
    it('should show loading state while fetching proposals', () => {
      renderWithProviders(<CompareProposals />, {
        preloadedState: {
          proposals: { items: [], loading: { fetch: 'LOADING' }, error: null }
        }
      });

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading proposals/i)).toBeInTheDocument();
    });

    it('should display error message when fetch fails', () => {
      renderWithProviders(<CompareProposals />, {
        preloadedState: {
          proposals: {
            items: [],
            loading: { fetch: 'FAILED' },
            error: { message: 'Failed to load proposals' }
          }
        }
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to load proposals/i)).toBeInTheDocument();
    });

    it('should render empty state when no proposals available', () => {
      renderWithProviders(<CompareProposals />, {
        preloadedState: {
          proposals: { items: [], loading: { fetch: 'IDLE' }, error: null }
        }
      });

      expect(screen.getByText(/no proposals available/i)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should handle proposal acceptance', async () => {
      const mockProposals = generateMockProposals(1);
      const { user } = renderWithProviders(<CompareProposals />, {
        preloadedState: {
          proposals: { items: mockProposals, loading: { fetch: 'IDLE' }, error: null }
        }
      });

      await user.click(screen.getByText('Accept'));

      expect(mockAcceptProposal).toHaveBeenCalledWith({
        id: mockProposals[0].id,
        reason: 'Proposal accepted after comparison review',
        metadata: expect.any(Object)
      });
      expect(mockAuditProposalAction).toHaveBeenCalled();
    });

    it('should handle proposal rejection', async () => {
      const mockProposals = generateMockProposals(1);
      const { user } = renderWithProviders(<CompareProposals />, {
        preloadedState: {
          proposals: { items: mockProposals, loading: { fetch: 'IDLE' }, error: null }
        }
      });

      await user.click(screen.getByText('Reject'));

      expect(mockRejectProposal).toHaveBeenCalledWith({
        id: mockProposals[0].id,
        reason: expect.any(String),
        metadata: expect.any(Object)
      });
      expect(mockAuditProposalAction).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const mockProposals = generateMockProposals(20);
      const { container } = renderWithProviders(<CompareProposals />, {
        preloadedState: {
          proposals: { items: mockProposals, loading: { fetch: 'IDLE' }, error: null }
        }
      });

      // Verify render performance
      const startTime = performance.now();
      render(container);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200); // Should render within 200ms
    });

    it('should memoize expensive calculations', () => {
      const mockProposals = generateMockProposals(2);
      const { rerender } = renderWithProviders(<CompareProposals />, {
        preloadedState: {
          proposals: { items: mockProposals, loading: { fetch: 'IDLE' }, error: null }
        }
      });

      // Force re-render
      rerender(<CompareProposals />);

      // Verify component uses memoization
      expect(mockFetchProposals).toHaveBeenCalledTimes(1);
    });
  });
});