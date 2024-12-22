import React from 'react'; // v18.0.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'; // v0.34.0
import { axe } from '@axe-core/react'; // v4.7.3
import Layout from '../Layout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useAuth } from '../../../hooks/useAuth';

// Mock hooks
vi.mock('../../../hooks/useMediaQuery');
vi.mock('../../../hooks/useAuth');

// Mock child components
vi.mock('../Header', () => ({
  default: ({ onSessionExpired }: { onSessionExpired: () => void }) => (
    <header role="banner" data-testid="header">
      <button onClick={onSessionExpired}>Trigger Session Expired</button>
    </header>
  ),
}));

vi.mock('../Footer', () => ({
  default: () => <footer role="contentinfo" data-testid="footer">Footer</footer>,
}));

vi.mock('../Sidebar', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <aside role="complementary" data-testid="sidebar" aria-hidden={!isOpen}>
      <button onClick={onClose}>Close Sidebar</button>
    </aside>
  ),
}));

// Helper function to render Layout with all required providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const mockAuth = {
    isAuthenticated: true,
    user: { name: 'Test User' },
  };

  (useAuth as jest.Mock).mockReturnValue(mockAuth);
  (useMediaQuery as jest.Mock).mockReturnValue(false);

  return render(ui, options);
};

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.innerWidth = 1024; // Default to desktop view
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Layout Structure Tests', () => {
    it('should render all main layout components correctly', () => {
      renderWithProviders(<Layout>Content</Layout>);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render skip to main content link', () => {
      renderWithProviders(<Layout>Content</Layout>);
      const skipLink = screen.getByText('Skip to main content');

      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('should focus main content when skip link is used', async () => {
      renderWithProviders(<Layout>Content</Layout>);
      const skipLink = screen.getByText('Skip to main content');
      const mainContent = screen.getByRole('main');

      fireEvent.click(skipLink);
      await waitFor(() => {
        expect(mainContent).toHaveFocus();
      });
    });
  });

  describe('Responsive Behavior Tests', () => {
    it('should show sidebar by default on desktop', () => {
      (useMediaQuery as jest.Mock).mockReturnValue(true); // Desktop view
      renderWithProviders(<Layout>Content</Layout>);

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveAttribute('aria-hidden', 'false');
    });

    it('should hide sidebar on mobile by default', () => {
      (useMediaQuery as jest.Mock).mockReturnValue(false); // Mobile view
      renderWithProviders(<Layout>Content</Layout>);

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    });

    it('should adjust main content margin based on sidebar visibility', async () => {
      const { rerender } = renderWithProviders(<Layout>Content</Layout>);
      const mainContent = screen.getByRole('main');

      // Desktop with sidebar
      (useMediaQuery as jest.Mock).mockReturnValue(true);
      rerender(<Layout>Content</Layout>);
      expect(mainContent).toHaveClass('ml-0 md:ml-64');

      // Mobile without sidebar
      (useMediaQuery as jest.Mock).mockReturnValue(false);
      rerender(<Layout>Content</Layout>);
      expect(mainContent).not.toHaveClass('md:ml-64');
    });
  });

  describe('Accessibility Tests', () => {
    it('should pass axe accessibility tests', async () => {
      const { container } = renderWithProviders(<Layout>Content</Layout>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should maintain proper focus management', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Layout>Content</Layout>);

      // Test keyboard navigation
      await user.tab(); // Focus skip link
      expect(screen.getByText('Skip to main content')).toHaveFocus();

      await user.tab(); // Move to next focusable element
      expect(document.activeElement).not.toBe(screen.getByText('Skip to main content'));
    });

    it('should have proper ARIA landmarks', () => {
      renderWithProviders(<Layout>Content</Layout>);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('should handle window resize events efficiently', async () => {
      vi.useFakeTimers();
      renderWithProviders(<Layout>Content</Layout>);

      // Simulate multiple rapid resize events
      for (let i = 0; i < 10; i++) {
        window.innerWidth = 800 + i;
        fireEvent.resize(window);
      }

      // Fast-forward timers to trigger debounced handler
      vi.runAllTimers();

      // Verify only one state update occurred
      expect(useMediaQuery).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should cleanup resize listeners on unmount', () => {
      const { unmount } = renderWithProviders(<Layout>Content</Layout>);
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Authentication Integration Tests', () => {
    it('should not render sidebar when user is not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: false });
      renderWithProviders(<Layout>Content</Layout>);

      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    });

    it('should handle session expiration correctly', async () => {
      const mockHandleSessionExpired = vi.fn();
      renderWithProviders(<Layout>Content</Layout>);

      // Trigger session expired event
      fireEvent.click(screen.getByText('Trigger Session Expired'));

      await waitFor(() => {
        const sidebar = screen.getByTestId('sidebar');
        expect(sidebar).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});