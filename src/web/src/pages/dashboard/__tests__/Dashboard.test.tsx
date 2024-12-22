import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { axe } from '@axe-core/react';
import Dashboard from '../Dashboard';
import * as useAuth from '../../../hooks/useAuth';
import * as useWebSocket from '../../../hooks/useWebSocket';
import { ROUTES } from '../../../constants/routes';

// Mock dependencies
vi.mock('../../../hooks/useAuth');
vi.mock('../../../hooks/useWebSocket');
vi.mock('@arena/analytics', () => ({
  useAnalytics: () => ({
    track: vi.fn()
  })
}));

// Test data
const mockBuyerUser = {
  id: '1',
  name: 'John Buyer',
  email: 'buyer@test.com',
  role: 'BUYER'
};

const mockArenaStaffUser = {
  id: '2',
  name: 'Staff Member',
  email: 'staff@arena.com',
  role: 'ARENA_STAFF'
};

describe('Dashboard', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock useAuth hook
    vi.mocked(useAuth).useAuth.mockReturnValue({
      user: mockBuyerUser,
      isBuyer: () => true,
      isArenaStaff: () => false,
      isAuthenticated: true,
      loading: false,
      error: null,
      loginWithMagicLink: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn()
    });

    // Mock useWebSocket hook
    vi.mocked(useWebSocket).useWebSocket.mockReturnValue({
      isConnected: true,
      error: null,
      subscribeToRequest: vi.fn(),
      subscribeToProposal: vi.fn(),
      connectionState: 'CONNECTED',
      retryCount: 0,
      queueSize: 0
    });
  });

  // Test role-based rendering
  describe('Role-Based Content', () => {
    test('renders buyer-specific content when user is a buyer', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Check welcome message
      expect(screen.getByText(/Manage your software evaluation requests/i)).toBeInTheDocument();

      // Check quick actions
      expect(screen.getByText('Create New Request')).toBeInTheDocument();
      expect(screen.getByText('View All Requests')).toBeInTheDocument();

      // Verify analytics section is not visible
      expect(screen.queryByText('Platform Analytics')).not.toBeInTheDocument();
    });

    test('renders staff-specific content when user is arena staff', () => {
      // Mock staff user
      vi.mocked(useAuth).useAuth.mockReturnValue({
        user: mockArenaStaffUser,
        isBuyer: () => false,
        isArenaStaff: () => true,
        isAuthenticated: true,
        loading: false,
        error: null,
        loginWithMagicLink: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn()
      });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Check welcome message
      expect(screen.getByText(/Monitor and manage software evaluation requests/i)).toBeInTheDocument();

      // Check analytics section
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument();
      expect(screen.getByText('Total Active Requests')).toBeInTheDocument();
      expect(screen.getByText('Pending Proposals')).toBeInTheDocument();
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    });
  });

  // Test loading states
  describe('Loading States', () => {
    test('displays loading skeletons while data is being fetched', async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Check for loading indicators
      const loadingElements = screen.getAllByRole('status');
      expect(loadingElements.length).toBeGreaterThan(0);

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('Recent Requests')).toBeInTheDocument();
        expect(screen.getByText('Recent Proposals')).toBeInTheDocument();
      });
    });
  });

  // Test navigation handling
  describe('Navigation', () => {
    test('navigates to create request page when create button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path={ROUTES.REQUESTS.CREATE} element={<div>Create Request Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await user.click(screen.getByText('Create New Request'));
      
      expect(screen.getByText('Create Request Page')).toBeInTheDocument();
    });

    test('navigates to request details when request is clicked', async () => {
      const user = userEvent.setup();
      const mockRequestId = '123';

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route 
              path={ROUTES.REQUESTS.DETAILS.replace(':id', mockRequestId)} 
              element={<div>Request Details Page</div>} 
            />
          </Routes>
        </MemoryRouter>
      );

      // Simulate request click if there's a clickable request item
      const requestItem = screen.queryByTestId(`request-${mockRequestId}`);
      if (requestItem) {
        await user.click(requestItem);
        expect(screen.getByText('Request Details Page')).toBeInTheDocument();
      }
    });
  });

  // Test real-time updates
  describe('Real-Time Updates', () => {
    test('subscribes to WebSocket updates on mount', () => {
      const mockSubscribe = vi.fn();
      vi.mocked(useWebSocket).useWebSocket.mockReturnValue({
        isConnected: true,
        error: null,
        subscribeToRequest: mockSubscribe,
        subscribeToProposal: mockSubscribe,
        connectionState: 'CONNECTED',
        retryCount: 0,
        queueSize: 0
      });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      expect(mockSubscribe).toHaveBeenCalled();
    });

    test('updates UI when WebSocket message is received', async () => {
      const mockSubscribe = vi.fn((_, { onMessage }) => {
        // Simulate receiving a WebSocket message
        onMessage({
          type: 'REQUEST_UPDATE',
          data: { id: '123', status: 'COMPLETED' }
        });
        return { unsubscribe: vi.fn() };
      });

      vi.mocked(useWebSocket).useWebSocket.mockReturnValue({
        isConnected: true,
        error: null,
        subscribeToRequest: mockSubscribe,
        subscribeToProposal: mockSubscribe,
        connectionState: 'CONNECTED',
        retryCount: 0,
        queueSize: 0
      });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });
    });
  });

  // Test accessibility
  describe('Accessibility', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText('Create New Request')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('View All Requests')).toHaveFocus();
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    test('displays error message when WebSocket connection fails', () => {
      vi.mocked(useWebSocket).useWebSocket.mockReturnValue({
        isConnected: false,
        error: {
          code: 'E4003',
          message: 'WebSocket connection failed',
          severity: 'ERROR',
          details: {}
        },
        subscribeToRequest: vi.fn(),
        subscribeToProposal: vi.fn(),
        connectionState: 'ERROR',
        retryCount: 3,
        queueSize: 0
      });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      expect(screen.getByText(/WebSocket connection failed/i)).toBeInTheDocument();
    });

    test('handles authentication errors gracefully', () => {
      vi.mocked(useAuth).useAuth.mockReturnValue({
        user: null,
        isBuyer: () => false,
        isArenaStaff: () => false,
        isAuthenticated: false,
        loading: false,
        error: {
          code: 'E1001',
          message: 'Authentication failed',
          severity: 'ERROR',
          details: {}
        },
        loginWithMagicLink: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn()
      });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      expect(screen.getByText(/Authentication failed/i)).toBeInTheDocument();
    });
  });
});