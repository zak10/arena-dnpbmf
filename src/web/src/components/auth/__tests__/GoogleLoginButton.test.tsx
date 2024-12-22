import React from 'react'; // v18.0.0
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { vi } from 'vitest'; // v0.34.0
import GoogleLoginButton from '../GoogleLoginButton';
import { useAuth } from '../../../hooks/useAuth';
import { ErrorResponse } from '../../../types/common';

// Mock useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

describe('GoogleLoginButton', () => {
  // Mock functions for testing callbacks
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();
  const mockLoginWithGoogle = vi.fn();
  
  // Default props for component
  const defaultProps = {
    onSuccess: mockOnSuccess,
    onError: mockOnError,
    retryAttempts: 3
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup default useAuth mock implementation
    (useAuth as jest.Mock).mockReturnValue({
      loginWithGoogle: mockLoginWithGoogle
    });

    // Mock crypto.randomUUID for state parameter generation
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('mock-state-param');

    // Mock sessionStorage
    const mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage
    });
  });

  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });

  it('renders correctly with proper accessibility attributes', () => {
    render(<GoogleLoginButton {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /sign in with google workspace/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Sign in with Google Workspace');
    expect(button).toHaveAttribute('data-testid', 'google-login-button');
    expect(button).not.toBeDisabled();
  });

  it('implements PKCE flow correctly', async () => {
    render(<GoogleLoginButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);

    // Verify state parameter handling
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      'google_oauth_state',
      'mock-state-param'
    );

    // Verify Google login called with correct parameters
    expect(mockLoginWithGoogle).toHaveBeenCalledWith({
      state: 'mock-state-param',
      workspace: true
    });

    // Verify state cleanup after successful login
    await waitFor(() => {
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('google_oauth_state');
    });
  });

  it('handles loading state correctly', async () => {
    mockLoginWithGoogle.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<GoogleLoginButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);

    // Verify loading state
    expect(button).toBeDisabled();
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(button).not.toBeDisabled();
      expect(screen.getByText('Sign in with Google Workspace')).toBeInTheDocument();
    });
  });

  it('handles retry attempts correctly', async () => {
    const error: ErrorResponse = {
      code: 'E1001',
      message: 'Authentication failed',
      details: {},
      severity: 'ERROR'
    };

    mockLoginWithGoogle.mockRejectedValue(error);
    
    render(<GoogleLoginButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    
    // First attempt
    await userEvent.click(button);
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith({
        code: 'E1001',
        message: 'Authentication failed. Retrying... (1/3)',
        details: { error, retryCount: 1 },
        severity: 'WARNING'
      });
    });

    // Second attempt
    await userEvent.click(button);
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith({
        code: 'E1001',
        message: 'Authentication failed. Retrying... (2/3)',
        details: { error, retryCount: 2 },
        severity: 'WARNING'
      });
    });

    // Third and final attempt
    await userEvent.click(button);
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith({
        code: 'E1001',
        message: 'Authentication failed. Please try again later.',
        details: { error },
        severity: 'ERROR'
      });
      expect(button).toBeDisabled();
    });
  });

  it('handles successful authentication correctly', async () => {
    mockLoginWithGoogle.mockResolvedValue({});
    
    render(<GoogleLoginButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('google_oauth_state');
    });
  });

  it('prevents multiple simultaneous login attempts', async () => {
    mockLoginWithGoogle.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<GoogleLoginButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    
    // Attempt multiple rapid clicks
    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);

    expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('renders error boundary fallback on error', () => {
    const ErrorComponent = () => {
      throw new Error('Test error');
    };

    render(
      <GoogleLoginButton {...defaultProps}>
        <ErrorComponent />
      </GoogleLoginButton>
    );

    expect(screen.getByText('Sign in Unavailable')).toBeInTheDocument();
  });
});