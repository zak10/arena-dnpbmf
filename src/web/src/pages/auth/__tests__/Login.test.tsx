import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { axe } from '@axe-core/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Login from '../Login';
import { useAuth } from '../../../hooks/useAuth';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn()
  };
});

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Helper function to render component with router context
const renderWithRouter = (
  ui: React.ReactElement,
  { route = '/' } = {}
) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

describe('Login Page', () => {
  const mockNavigate = vi.fn();
  const mockLoginWithGoogle = vi.fn();
  const mockSendMagicLink = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      loginWithGoogle: mockLoginWithGoogle,
      sendMagicLink: mockSendMagicLink,
      loading: false,
      error: null
    });
  });

  it('renders login page with proper structure and accessibility', async () => {
    const { container } = renderWithRouter(<Login />);

    // Check main heading
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign in to Arena');

    // Check authentication sections
    expect(screen.getByText('Sign in with Google Workspace')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Magic Link')).toBeInTheDocument();

    // Verify form elements
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /business email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /magic link/i })).toBeInTheDocument();

    // Check support link
    expect(screen.getByRole('link', { name: /contact support/i })).toBeInTheDocument();

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('redirects authenticated users to dashboard', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      loginWithGoogle: mockLoginWithGoogle,
      sendMagicLink: mockSendMagicLink
    });

    renderWithRouter(<Login />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Google OAuth Authentication', () => {
    it('handles successful Google login', async () => {
      renderWithRouter(<Login />);
      const googleButton = screen.getByRole('button', { name: /google/i });

      mockLoginWithGoogle.mockResolvedValueOnce(undefined);
      await userEvent.click(googleButton);

      await waitFor(() => {
        expect(mockLoginWithGoogle).toHaveBeenCalledWith({
          workspace: true,
          state: expect.any(String)
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('displays error for non-workspace account', async () => {
      renderWithRouter(<Login />);
      const googleButton = screen.getByRole('button', { name: /google/i });

      mockLoginWithGoogle.mockRejectedValueOnce(new Error('Invalid workspace account'));
      await userEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid workspace account');
      });
    });

    it('handles rate limiting for Google auth', async () => {
      renderWithRouter(<Login />);
      const googleButton = screen.getByRole('button', { name: /google/i });

      mockLoginWithGoogle.mockRejectedValueOnce(new Error('Rate limit exceeded'));
      await userEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Rate limit exceeded');
      });
    });
  });

  describe('Magic Link Authentication', () => {
    it('validates business email format', async () => {
      renderWithRouter(<Login />);
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      const submitButton = screen.getByRole('button', { name: /magic link/i });

      // Test invalid email format
      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.click(submitButton);
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();

      // Test personal email domain
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'user@gmail.com');
      await userEvent.click(submitButton);
      expect(screen.getByText(/please use your business email/i)).toBeInTheDocument();

      // Test valid business email
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'user@company.com');
      await userEvent.click(submitButton);
      expect(mockSendMagicLink).toHaveBeenCalledWith({
        email: 'user@company.com'
      });
    });

    it('enforces rate limiting for magic link requests', async () => {
      renderWithRouter(<Login />);
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      const submitButton = screen.getByRole('button', { name: /magic link/i });

      mockSendMagicLink.mockRejectedValue(new Error('Rate limit exceeded'));
      
      await userEvent.type(emailInput, 'user@company.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/too many attempts/i);
      });
    });

    it('shows success message after sending magic link', async () => {
      renderWithRouter(<Login />);
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      const submitButton = screen.getByRole('button', { name: /magic link/i });

      mockSendMagicLink.mockResolvedValueOnce(undefined);
      
      await userEvent.type(emailInput, 'user@company.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays authentication errors with proper styling', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        loginWithGoogle: mockLoginWithGoogle,
        sendMagicLink: mockSendMagicLink,
        error: { message: 'Authentication failed' }
      });

      renderWithRouter(<Login />);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent('Authentication failed');
      expect(errorAlert).toHaveClass('bg-red-50', 'border-red-200');
    });

    it('clears errors when switching authentication methods', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        loginWithGoogle: mockLoginWithGoogle,
        sendMagicLink: mockSendMagicLink,
        error: { message: 'Authentication failed' }
      });

      renderWithRouter(<Login />);
      
      // Initial error is shown
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Switch between auth methods
      const googleButton = screen.getByRole('button', { name: /google/i });
      await userEvent.click(googleButton);

      // Error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation between form elements', async () => {
      renderWithRouter(<Login />);
      
      const googleButton = screen.getByRole('button', { name: /google/i });
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      const magicLinkButton = screen.getByRole('button', { name: /magic link/i });
      const supportLink = screen.getByRole('link', { name: /contact support/i });

      // Start from first element
      googleButton.focus();
      expect(document.activeElement).toBe(googleButton);

      // Tab through elements
      await userEvent.tab();
      expect(document.activeElement).toBe(emailInput);

      await userEvent.tab();
      expect(document.activeElement).toBe(magicLinkButton);

      await userEvent.tab();
      expect(document.activeElement).toBe(supportLink);
    });
  });
});