import React from 'react'; // v18.0.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v13.4.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import ProposalComparison from '../ProposalComparison';
import type { Proposal, ProposalStatus } from '../../../types/proposals';
import type { DataClassification } from '../../../types/common';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver for responsive testing
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Mock proposals data
const mockProposals: Proposal[] = [
  {
    id: '1',
    requestId: 'req-1',
    vendorId: 'vendor-1',
    status: ProposalStatus.SUBMITTED,
    pricing: {
      basePrice: 500,
      billingFrequency: 'MONTHLY',
      additionalCosts: {
        'API Access': 100,
        'Premium Support': 200
      }
    },
    vendorPitch: 'Vendor 1 pitch',
    documents: [],
    version: 1,
    submittedAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    lastModifiedBy: 'user-1',
    auditTrail: []
  },
  {
    id: '2',
    requestId: 'req-1',
    vendorId: 'vendor-2',
    status: ProposalStatus.SUBMITTED,
    pricing: {
      basePrice: 750,
      billingFrequency: 'MONTHLY',
      additionalCosts: {
        'API Access': 150,
        'Premium Support': 250,
        'Custom Integration': 500
      }
    },
    vendorPitch: 'Vendor 2 pitch',
    documents: [],
    version: 1,
    submittedAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    lastModifiedBy: 'user-1',
    auditTrail: []
  }
];

// Helper function to render component with test props
const renderComponent = ({
  proposals = mockProposals,
  onAccept = jest.fn(),
  onReject = jest.fn(),
  dataClassification = 'PUBLIC' as DataClassification
} = {}) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <ProposalComparison
        proposals={proposals}
        onAccept={onAccept}
        onReject={onReject}
        dataClassification={dataClassification}
      />
    )
  };
};

describe('ProposalComparison Component', () => {
  describe('Rendering and Layout', () => {
    it('renders multiple proposals in grid layout', () => {
      renderComponent();
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(mockProposals.length + 1); // +1 for header row
    });

    it('shows empty state when no proposals', () => {
      renderComponent({ proposals: [] });
      
      expect(screen.getByText('No proposals to compare')).toBeInTheDocument();
      expect(screen.getByText('Wait for vendors to submit their proposals')).toBeInTheDocument();
    });

    it('maintains responsive layout at breakpoints', async () => {
      const { container } = renderComponent();
      
      // Trigger resize observer
      const resizeCallback = mockResizeObserver.mock.calls[0][0];
      resizeCallback([{ contentRect: { width: 768 } }]);
      
      await waitFor(() => {
        expect(container.querySelector('.overflow-hidden')).toBeInTheDocument();
      });
    });

    it('preserves data classification labels', () => {
      renderComponent({ dataClassification: 'SENSITIVE' });
      
      // Verify pricing is masked for sensitive data
      expect(screen.getByText('(Contact for pricing)')).toBeInTheDocument();
    });
  });

  describe('Interaction Handlers', () => {
    it('handles proposal acceptance with confirmation', async () => {
      const onAccept = jest.fn();
      const { user } = renderComponent({ onAccept });
      
      const acceptButton = screen.getAllByText('Accept')[0];
      await user.click(acceptButton);
      
      expect(onAccept).toHaveBeenCalledWith(mockProposals[0].id);
    });

    it('handles proposal rejection with reason', async () => {
      const onReject = jest.fn();
      const { user } = renderComponent({ onReject });
      
      const rejectButton = screen.getAllByText('Reject')[0];
      await user.click(rejectButton);
      
      expect(onReject).toHaveBeenCalledWith(mockProposals[0].id, '');
    });

    it('supports keyboard navigation between proposals', async () => {
      const { user } = renderComponent();
      
      const firstRow = screen.getAllByRole('row')[1];
      await user.tab();
      
      expect(firstRow).toHaveFocus();
    });
  });

  describe('Feature Comparison', () => {
    it('displays feature matrix accurately', () => {
      renderComponent();
      
      mockProposals[0].pricing.additionalCosts['API Access'];
      expect(screen.getByText('API Access')).toBeInTheDocument();
    });

    it('shows feature support indicators', () => {
      renderComponent();
      
      const features = screen.getAllByRole('cell');
      expect(features.some(f => f.textContent?.includes('Additional cost'))).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 AA requirements', async () => {
      const { container } = renderComponent();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports screen reader navigation', () => {
      renderComponent();
      
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-labelledby');
      
      const srNote = screen.getByRole('note');
      expect(srNote).toHaveClass('sr-only');
    });

    it('maintains keyboard focus management', async () => {
      const { user } = renderComponent();
      
      await user.tab();
      const focusedElement = document.activeElement;
      expect(focusedElement).toHaveAttribute('role', 'button');
    });
  });

  describe('Error Handling', () => {
    it('recovers from rendering errors', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const invalidProps = {
        proposals: [{ ...mockProposals[0], pricing: null }]
      };
      
      renderComponent(invalidProps as any);
      
      expect(screen.getByText('Unable to load proposal comparison')).toBeInTheDocument();
      errorSpy.mockRestore();
    });

    it('prevents data leaks', () => {
      renderComponent({ dataClassification: 'HIGHLY_SENSITIVE' });
      
      const pricingCells = screen.getAllByRole('cell');
      pricingCells.forEach(cell => {
        expect(cell.textContent).not.toMatch(/\$\d+/);
      });
    });
  });
});