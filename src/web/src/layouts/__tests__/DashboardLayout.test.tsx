import React from 'react'; // v18.0.0
import { render, screen, fireEvent, act } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { axe, toHaveNoViolations } from 'jest-axe'; // v7.0.0
import DashboardLayout from '../DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = IntersectionObserverMock;

describe('DashboardLayout', () => {
  // Common test setup
  const mockNavigate = jest.fn();
  const mockUser = {
    id: '123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'BUYER'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mocks
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true
    });

    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });

    // Reset window event listeners
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  describe('Component Rendering', () => {
    it('should render all layout components in correct hierarchy', () => {
      render(
        <DashboardLayout>
          <div data-testid="test-content">Content</div>
        </DashboardLayout>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // Sidebar
      expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should apply grid system classes correctly', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('flex-1', 'pt-16');
      expect(mainContent).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
    });

    it('should handle custom className prop', () => {
      const customClass = 'custom-test-class';
      const { container } = render(
        <DashboardLayout className={customClass}>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(container.firstChild).toHaveClass(customClass);
    });
  });

  describe('Responsive Behavior', () => {
    it('should hide sidebar by default on mobile', () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('should show sidebar by default on desktop', () => {
      // Set desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440
      });

      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const sidebar = screen.getByRole('navigation');
      expect(sidebar).not.toHaveClass('-translate-x-full');
    });

    it('should toggle sidebar on mobile menu click', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const menuButton = screen.getByRole('button', { name: /menu/i });
      await userEvent.click(menuButton);

      const sidebar = screen.getByRole('navigation');
      expect(sidebar).not.toHaveClass('-translate-x-full');
    });

    it('should handle touch interactions correctly', async () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const mainContent = screen.getByRole('main');

      // Simulate touch swipe
      fireEvent.touchStart(mainContent, { touches: [{ clientX: 0 }] });
      fireEvent.touchMove(mainContent, { touches: [{ clientX: 100 }] });
      fireEvent.touchEnd(mainContent);

      // Verify sidebar state changes
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('transform');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA landmarks', async () => {
      const { container } = render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Run axe accessibility tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Check specific landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Test skip link
      const skipLink = screen.getByText('Skip to main content');
      await userEvent.tab();
      expect(skipLink).toHaveFocus();

      // Test keyboard shortcuts
      fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).not.toHaveClass('-translate-x-full');
    });

    it('should manage focus correctly', async () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
      
      // Test focus management after sidebar toggle
      const menuButton = screen.getByRole('button', { name: /menu/i });
      await userEvent.click(menuButton);
      expect(document.activeElement).toBe(menuButton);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing child components gracefully', () => {
      render(<DashboardLayout />);
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });

    it('should maintain basic functionality with JS disabled', () => {
      // Simulate JS disabled by removing event listeners
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = jest.fn();

      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
      window.addEventListener = originalAddEventListener;
    });

    it('should handle navigation errors', () => {
      const mockNavigateWithError = jest.fn().mockImplementation(() => {
        throw new Error('Navigation failed');
      });
      (useNavigate as jest.Mock).mockReturnValue(mockNavigateWithError);

      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});