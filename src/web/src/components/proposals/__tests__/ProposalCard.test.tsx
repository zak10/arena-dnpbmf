// @version react@18.0.0
import React from 'react';
// @version @testing-library/react@14.0.0
import { render, screen, fireEvent, within } from '@testing-library/react';
// @version @testing-library/user-event@14.0.0
import userEvent from '@testing-library/user-event';
// @version @testing-library/jest-dom@5.16.0
import { toHaveStyle, toBeVisible } from '@testing-library/jest-dom';
// @version styled-components@5.3.0
import { ThemeProvider } from 'styled-components';

import { ProposalCard, ProposalCardProps } from '../ProposalCard';
import { ProposalStatus } from '../../types/proposals';

// Mock theme for styled-components
const theme = {
  colors: {
    primary: '#0066FF',
    background: '#FFFFFF',
    text: '#111827',
  },
};

/**
 * Custom render function that wraps component with necessary providers
 */
const customRender = (ui: React.ReactElement, options = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>,
    options
  );
};

/**
 * Mock proposal data factory with required fields
 */
const createMockProposal = (overrides = {}) => ({
  id: 'test-proposal-1',
  status: ProposalStatus.SUBMITTED,
  pricing: {
    basePrice: 1000,
    model: 'PER_USER',
    billingFrequency: 'MONTHLY',
    currency: 'USD',
  },
  submittedAt: '2023-01-01T00:00:00Z',
  documents: [
    {
      id: 'doc-1',
      name: 'Technical Specs',
      type: 'PDF',
    },
  ],
  vendor: {
    id: 'vendor-1',
    name: 'Test Vendor',
  },
  ...overrides,
});

describe('ProposalCard', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visual Rendering', () => {
    it('renders all proposal information correctly', () => {
      const proposal = createMockProposal();
      customRender(<ProposalCard proposal={proposal} />);

      // Verify proposal ID is displayed
      expect(screen.getByText(/test-proposal-1/i)).toBeVisible();

      // Verify price formatting
      expect(screen.getByText(/\$1,000\/monthly/i)).toBeVisible();

      // Verify submission date
      expect(screen.getByText(/January 1, 2023/i)).toBeVisible();

      // Verify document count
      expect(screen.getByText(/1 document/i)).toBeVisible();
    });

    it('applies correct status badge styles', () => {
      const statuses = [
        ProposalStatus.SUBMITTED,
        ProposalStatus.UNDER_REVIEW,
        ProposalStatus.ACCEPTED,
        ProposalStatus.REJECTED,
      ];

      statuses.forEach(status => {
        const proposal = createMockProposal({ status });
        const { rerender } = customRender(<ProposalCard proposal={proposal} />);

        const badge = screen.getByText(status);
        expect(badge).toBeVisible();

        // Clean up before next render
        rerender(<></>);
      });
    });

    it('handles responsive layout correctly', () => {
      const proposal = createMockProposal();
      const { container } = customRender(<ProposalCard proposal={proposal} />);

      // Verify flex layout classes
      expect(container.querySelector('.flex')).toHaveStyle({
        display: 'flex',
      });

      // Verify responsive gap
      expect(container.querySelector('.gap-4')).toHaveStyle({
        gap: '1rem',
      });
    });
  });

  describe('Interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = jest.fn();
      const proposal = createMockProposal();
      
      customRender(
        <ProposalCard 
          proposal={proposal}
          onClick={handleClick}
        />
      );

      const card = screen.getByRole('article');
      await userEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(proposal);
    });

    it('handles keyboard navigation correctly', async () => {
      const handleKeyPress = jest.fn();
      const proposal = createMockProposal();

      customRender(
        <ProposalCard
          proposal={proposal}
          onKeyPress={handleKeyPress}
        />
      );

      const card = screen.getByRole('article');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(handleKeyPress).toHaveBeenCalledTimes(1);
      expect(handleKeyPress.mock.calls[0][1]).toEqual(proposal);
    });

    it('maintains focus states for keyboard navigation', async () => {
      const proposal = createMockProposal();
      customRender(<ProposalCard proposal={proposal} onClick={() => {}} />);

      const card = screen.getByRole('article');
      card.focus();

      expect(card).toHaveFocus();
      expect(card).toHaveStyle({
        outline: expect.stringContaining('2px'),
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      const proposal = createMockProposal();
      customRender(<ProposalCard proposal={proposal} />);

      const card = screen.getByRole('article');
      
      // Verify ARIA label includes key information
      expect(card).toHaveAttribute('aria-label', expect.stringContaining(proposal.status));
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('$1,000'));
    });

    it('maintains proper heading hierarchy', () => {
      const proposal = createMockProposal();
      customRender(<ProposalCard proposal={proposal} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeVisible();
      expect(heading).toHaveTextContent(proposal.id);
    });

    it('uses semantic HTML for date information', () => {
      const proposal = createMockProposal();
      customRender(<ProposalCard proposal={proposal} />);

      const dateElement = screen.getByRole('time');
      expect(dateElement).toHaveAttribute('dateTime', proposal.submittedAt);
    });
  });

  describe('Error Handling', () => {
    it('handles missing price information gracefully', () => {
      const proposal = createMockProposal({ pricing: null });
      customRender(<ProposalCard proposal={proposal} />);

      expect(screen.getByText('—')).toBeVisible();
    });

    it('handles missing documents gracefully', () => {
      const proposal = createMockProposal({ documents: [] });
      customRender(<ProposalCard proposal={proposal} />);

      expect(screen.queryByText(/documents/i)).not.toBeInTheDocument();
    });

    it('handles invalid dates gracefully', () => {
      const proposal = createMockProposal({ submittedAt: 'invalid-date' });
      customRender(<ProposalCard proposal={proposal} />);

      const dateElement = screen.getByRole('time');
      expect(dateElement).toBeVisible();
      expect(dateElement).toHaveTextContent(/invalid date/i);
    });
  });

  describe('Internationalization', () => {
    it('formats currency according to locale', () => {
      const proposal = createMockProposal({
        pricing: {
          basePrice: 1000,
          currency: 'EUR',
          billingFrequency: 'MONTHLY',
        },
      });

      customRender(<ProposalCard proposal={proposal} />);
      expect(screen.getByText(/€1,000\/monthly/i)).toBeVisible();
    });

    it('formats dates according to locale', () => {
      const proposal = createMockProposal();
      customRender(<ProposalCard proposal={proposal} />);

      const dateElement = screen.getByRole('time');
      expect(dateElement).toHaveTextContent(/January 1, 2023/i);
    });
  });
});