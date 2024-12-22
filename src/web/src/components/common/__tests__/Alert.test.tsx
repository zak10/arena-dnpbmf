import React from 'react'; // v18.0.0
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'; // v13.4.0
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import Alert from '../Alert';

// Constants for testing
const TEST_MESSAGE = 'Test alert message';
const TEST_TITLE = 'Test alert title';
const SEVERITY_VARIANTS = ['success', 'error', 'warning', 'info'] as const;

// Mock ResizeObserver for animation testing
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
global.ResizeObserver = mockResizeObserver;

// Helper function to render Alert with default test props
const renderAlert = (props: Partial<React.ComponentProps<typeof Alert>> = {}) => {
  const user = userEvent.setup();
  const defaultProps = {
    children: TEST_MESSAGE,
    severity: 'info' as const,
    ...props,
  };
  
  const utils = render(<Alert {...defaultProps} />);
  return {
    ...utils,
    user,
    alert: screen.getByRole('alert'),
  };
};

describe('Alert Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      const { alert } = renderAlert();
      
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'polite');
      expect(alert).toHaveAttribute('data-severity', 'info');
      expect(alert).toHaveTextContent(TEST_MESSAGE);
    });

    it('renders with title when provided', () => {
      renderAlert({ title: TEST_TITLE });
      
      const heading = screen.getByRole('heading', { name: TEST_TITLE });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('font-semibold', 'mb-1', 'text-sm');
    });

    it('applies custom className when provided', () => {
      const customClass = 'custom-alert';
      const { alert } = renderAlert({ className: customClass });
      
      expect(alert).toHaveClass(customClass);
    });
  });

  describe('Severity Variants', () => {
    it.each(SEVERITY_VARIANTS)('renders correct styles for %s severity', (severity) => {
      const { alert } = renderAlert({ severity });
      
      // Verify severity-specific styles
      const severityStyles = {
        success: 'bg-green-50 text-green-800',
        error: 'bg-red-50 text-red-800',
        warning: 'bg-yellow-50 text-yellow-800',
        info: 'bg-blue-50 text-blue-800',
      };
      
      expect(alert).toHaveClass(severityStyles[severity]);
      expect(alert).toHaveAttribute('data-severity', severity);
    });

    it('sets correct aria-live attribute based on severity', () => {
      const { alert: errorAlert } = renderAlert({ severity: 'error' });
      const { alert: infoAlert } = renderAlert({ severity: 'info' });
      
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      expect(infoAlert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Dismissible Functionality', () => {
    it('renders dismiss button when dismissible is true', () => {
      renderAlert({ dismissible: true });
      
      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton).toHaveAttribute('type', 'button');
    });

    it('does not render dismiss button when dismissible is false', () => {
      renderAlert({ dismissible: false });
      
      const dismissButton = screen.queryByRole('button', { name: /dismiss alert/i });
      expect(dismissButton).not.toBeInTheDocument();
    });

    it('calls onDismiss and removes alert when dismiss button is clicked', async () => {
      const onDismiss = jest.fn();
      const { alert, user } = renderAlert({ dismissible: true, onDismiss });
      
      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButton);
      
      // Wait for animation and cleanup
      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(alert).not.toBeInTheDocument();
      });
    });

    it('handles keyboard interactions for dismissal', async () => {
      const onDismiss = jest.fn();
      const { user } = renderAlert({ dismissible: true, onDismiss });
      
      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      
      // Test Enter key
      await user.type(dismissButton, '{Enter}');
      expect(onDismiss).toHaveBeenCalledTimes(1);
      
      // Test Space key
      await user.type(dismissButton, '{Space}');
      expect(onDismiss).toHaveBeenCalledTimes(2);
      
      // Test Escape key
      await user.keyboard('{Escape}');
      expect(onDismiss).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('has accessible icon labels', () => {
      const { alert } = renderAlert();
      
      const icons = within(alert).getAllByRole('img');
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'false');
        expect(icon).toHaveAttribute('aria-labelledby');
      });
    });

    it('maintains focus management when dismissed', async () => {
      const { user } = renderAlert({ dismissible: true });
      
      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      dismissButton.focus();
      expect(dismissButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      // Verify focus moves to body when alert is removed
      await waitFor(() => {
        expect(document.body).toHaveFocus();
      });
    });

    it('supports high contrast mode styles', () => {
      const { alert } = renderAlert();
      
      // Verify presence of focus ring styles for high contrast
      expect(alert).toHaveClass('focus-within:ring-blue-500');
    });
  });

  describe('Animation Behavior', () => {
    it('applies enter animation classes on mount', () => {
      const { alert } = renderAlert();
      
      expect(alert).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
    });

    it('applies exit animation classes when dismissed', async () => {
      const { alert, user } = renderAlert({ dismissible: true });
      
      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButton);
      
      expect(alert).toHaveClass('opacity-0', 'scale-95');
    });
  });
});