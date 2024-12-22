/**
 * @fileoverview Test suite for the RequestList component verifying rendering,
 * pagination, accessibility, RTL support, and responsive behavior.
 * @version 1.0.0
 */

// @version react@18.0.0
import React from 'react';
// @version @testing-library/react@14.0.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
// @version vitest@0.34.0
import { vi, describe, it, expect, beforeEach } from 'vitest';
// @version @testing-library/user-event@14.0.0
import userEvent from '@testing-library/user-event';
// @version @axe-core/react@4.7.0
import { axe, toHaveNoViolations } from '@axe-core/react';
// @version @testing-library/react-hooks@8.0.0
import { renderHook } from '@testing-library/react-hooks';

// Internal imports
import RequestList from '../RequestList';
import type { Request } from '../../types/requests';
import type { PaginatedResponse } from '../../types/common';

// Add custom matchers
expect.extend(toHaveNoViolations);

// Mock data
const mockRequests: PaginatedResponse<Request> = {
  items: [
    {
      id: '1',
      status: 'PENDING',
      requirementsText: 'Test requirements 1',
      documents: [],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      parsedRequirements: {},
      lastModifiedBy: 'user1',
      version: 1
    },
    {
      id: '2',
      status: 'COMPLETED',
      requirementsText: 'Test requirements 2',
      documents: [],
      createdAt: '2023-01-02T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      parsedRequirements: {},
      lastModifiedBy: 'user1',
      version: 1
    }
  ],
  total: 2,
  page: 1,
  pageSize: 10,
  hasMore: false,
  totalPages: 1
};

// Mock handlers
const mockHandlers = {
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  onRequestClick: vi.fn(),
  onRetry: vi.fn()
};

describe('RequestList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandlers.onPageChange.mockReset();
    mockHandlers.onPageSizeChange.mockReset();
    mockHandlers.onRequestClick.mockReset();
    mockHandlers.onRetry.mockReset();
  });

  describe('Rendering States', () => {
    it('should render loading state correctly', () => {
      render(
        <RequestList
          requests={mockRequests}
          isLoading={true}
          error={null}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText(/loading requests/i)).toBeInTheDocument();
    });

    it('should render empty state correctly', () => {
      render(
        <RequestList
          requests={{ ...mockRequests, items: [], total: 0 }}
          isLoading={false}
          error={null}
          {...mockHandlers}
        />
      );

      expect(screen.getByText(/no requests found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create request/i })).toBeInTheDocument();
    });

    it('should render error state correctly', () => {
      const error = new Error('Test error');
      render(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={error}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/test error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render requests grid with correct spacing', () => {
      const { container } = render(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={null}
          {...mockHandlers}
        />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-4');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('md:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Pagination Behavior', () => {
    it('should handle page changes correctly', async () => {
      render(
        <RequestList
          requests={{ ...mockRequests, page: 1, totalPages: 3 }}
          isLoading={false}
          error={null}
          {...mockHandlers}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next page/i });
      await userEvent.click(nextButton);

      expect(mockHandlers.onPageChange).toHaveBeenCalledWith(2);
    });

    it('should handle page size changes correctly', async () => {
      render(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={null}
          {...mockHandlers}
        />
      );

      const pageSizeSelect = screen.getByLabelText(/items per page/i);
      await userEvent.selectOptions(pageSizeSelect, '25');

      expect(mockHandlers.onPageSizeChange).toHaveBeenCalledWith(25);
    });

    it('should disable pagination buttons at boundaries', () => {
      render(
        <RequestList
          requests={{ ...mockRequests, page: 1, totalPages: 1 }}
          isLoading={false}
          error={null}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={null}
          {...mockHandlers}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={null}
          {...mockHandlers}
        />
      );

      const firstRequest = screen.getByRole('article', { name: /request 1 of 2/i });
      firstRequest.focus();

      fireEvent.keyDown(firstRequest, { key: 'ArrowRight' });
      expect(screen.getByRole('article', { name: /request 2 of 2/i })).toHaveFocus();
    });

    it('should announce loading and error states', async () => {
      const { rerender } = render(
        <RequestList
          requests={mockRequests}
          isLoading={true}
          error={null}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading requests');

      rerender(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={new Error('Test error')}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust grid columns based on viewport', () => {
      const { container } = render(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={null}
          {...mockHandlers}
        />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('md:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    it('should handle mobile touch interactions', async () => {
      render(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={null}
          {...mockHandlers}
        />
      );

      const request = screen.getByRole('article', { name: /request 1 of 2/i });
      await userEvent.click(request);

      expect(mockHandlers.onRequestClick).toHaveBeenCalledWith('1');
    });
  });

  describe('RTL Support', () => {
    it('should render correctly in RTL mode', () => {
      render(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={null}
          dir="rtl"
          {...mockHandlers}
        />
      );

      const container = screen.getByRole('navigation');
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    it('should adjust navigation arrows in RTL mode', () => {
      render(
        <RequestList
          requests={mockRequests}
          isLoading={false}
          error={null}
          dir="rtl"
          {...mockHandlers}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous page/i });
      const nextButton = screen.getByRole('button', { name: /next page/i });

      expect(prevButton).toHaveClass('rtl:rotate-180');
      expect(nextButton).toHaveClass('rtl:rotate-180');
    });
  });
});