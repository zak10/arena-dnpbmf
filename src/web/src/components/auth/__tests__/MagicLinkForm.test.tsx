import React from 'react'; // v18.0.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { vi } from 'vitest'; // v0.34.0
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7.0

import MagicLinkForm from '../MagicLinkForm';
import { requestMagicLink } from '../../../api/auth';
import { EMAIL_VALIDATION } from '../../../constants/validation';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock API function
vi.mock('../../../api/auth', () => ({
  requestMagicLink: vi.fn()
}));

// Mock localStorage for rate limiting
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key],
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('MagicLinkForm', () => {
  // Test setup and cleanup
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const form = screen.getByRole('form', { name: /magic link authentication form/i });
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      const submitButton = screen.getByRole('button', { name: /send magic link/i });

      expect(form).toHaveAttribute('aria-label');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(submitButton).toHaveAttribute('aria-disabled');
    });

    it('should support keyboard navigation', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      const submitButton = screen.getByRole('button', { name: /send magic link/i });

      // Tab navigation
      await userEvent.tab();
      expect(emailInput).toHaveFocus();
      
      await userEvent.tab();
      expect(submitButton).toHaveFocus();
    });

    it('should announce error messages to screen readers', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      await userEvent.type(emailInput, 'invalid@gmail.com');
      
      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-errormessage');
    });
  });

  describe('Email Validation', () => {
    it('should validate RFC 5322 email format', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      await userEvent.type(emailInput, 'invalid-email');
      
      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toHaveTextContent(/invalid email format/i);
    });

    it('should enforce 254 character limit', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      const longEmail = 'a'.repeat(245) + '@company.com';
      
      await userEvent.type(emailInput, longEmail);
      expect(emailInput).toHaveAttribute('maxLength', EMAIL_VALIDATION.MAX_LENGTH.toString());
    });

    it('should reject personal email domains', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      await userEvent.type(emailInput, 'user@gmail.com');
      
      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toHaveTextContent(/please use your business email/i);
    });

    it('should accept valid business domains', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      await userEvent.type(emailInput, 'user@company.com');
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce 3 attempts per hour limit', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      const submitButton = screen.getByRole('button', { name: /send magic link/i });

      // Make 3 attempts
      for (let i = 0; i < 3; i++) {
        await userEvent.clear(emailInput);
        await userEvent.type(emailInput, `user${i}@company.com`);
        await userEvent.click(submitButton);
      }

      // Verify rate limit message
      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toHaveTextContent(/too many attempts/i);
      expect(submitButton).toBeDisabled();
    });

    it('should show remaining attempts', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const emailInput = screen.getByRole('textbox', { name: /business email/i });
      const submitButton = screen.getByRole('button', { name: /send magic link/i });

      await userEvent.type(emailInput, 'user@company.com');
      await userEvent.click(submitButton);

      const remainingAttempts = screen.getByText(/2 attempts remaining/i);
      expect(remainingAttempts).toBeInTheDocument();
    });

    it('should reset rate limit after 1 hour', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      // Make 3 attempts
      for (let i = 0; i < 3; i++) {
        await userEvent.type(screen.getByRole('textbox'), `user${i}@company.com`);
        await userEvent.click(screen.getByRole('button'));
      }

      // Advance time by 1 hour
      vi.advanceTimersByTime(3600000);

      // Verify form is enabled again
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during submission', async () => {
      requestMagicLink.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      await userEvent.type(screen.getByRole('textbox'), 'user@company.com');
      await userEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should disable form during submission', async () => {
      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      const emailInput = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button');

      await userEvent.type(emailInput, 'user@company.com');
      await userEvent.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display API error messages', async () => {
      const apiError = new Error('API Error');
      requestMagicLink.mockRejectedValueOnce(apiError);

      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      await userEvent.type(screen.getByRole('textbox'), 'user@company.com');
      await userEvent.click(screen.getByRole('button'));

      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toHaveTextContent(/failed to send magic link/i);
      expect(mockOnError).toHaveBeenCalledWith(apiError.message);
    });

    it('should handle network failures gracefully', async () => {
      requestMagicLink.mockRejectedValueOnce(new Error('Network Error'));

      render(<MagicLinkForm onSuccess={mockOnSuccess} onError={mockOnError} />);
      
      await userEvent.type(screen.getByRole('textbox'), 'user@company.com');
      await userEvent.click(screen.getByRole('button'));

      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });
});