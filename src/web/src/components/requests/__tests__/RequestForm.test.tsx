/**
 * @fileoverview Comprehensive test suite for the RequestForm component
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import RequestForm from '../RequestForm';
import { createRequest } from '../../../api/requests';
import ErrorBoundary from '../../common/ErrorBoundary';
import { FILE_UPLOAD_VALIDATION, TEXT_INPUT_VALIDATION } from '../../../constants/validation';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock API functions
vi.mock('../../../api/requests', () => ({
  createRequest: vi.fn()
}));

// Test data
const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
const maliciousFile = new File(['malicious content'], 'malicious.exe', { type: 'application/x-msdownload' });
const validRequest = {
  requirementsText: 'Valid requirements text for software evaluation',
  documents: [mockFile]
};

describe('RequestForm', () => {
  // Setup and teardown
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('should meet WCAG 2.1 AA standards', async () => {
      const { container } = render(
        <RequestForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(
        <RequestForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
        />
      );

      const form = screen.getByRole('form');
      const textArea = screen.getByRole('textbox', { name: /requirements/i });
      const fileInput = screen.getByLabelText(/drop files/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Test tab order
      await userEvent.tab();
      expect(textArea).toHaveFocus();
      await userEvent.tab();
      expect(fileInput).toHaveFocus();
      await userEvent.tab();
      expect(cancelButton).toHaveFocus();
      await userEvent.tab();
      expect(submitButton).toHaveFocus();
    });

    it('should announce form validation errors', async () => {
      render(
        <RequestForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
        />
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(/requirements.*required/i);
    });
  });

  // Form validation tests
  describe('Form Validation', () => {
    it('should validate requirements text length', async () => {
      render(
        <RequestForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
        />
      );

      const textArea = screen.getByRole('textbox', { name: /requirements/i });
      
      // Test minimum length
      await userEvent.type(textArea, 'Too short');
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();

      // Test maximum length
      const longText = 'a'.repeat(TEXT_INPUT_VALIDATION.MAX_LENGTH + 1);
      await userEvent.clear(textArea);
      await userEvent.type(textArea, longText);
      expect(screen.getByText(/cannot exceed/i)).toBeInTheDocument();
    });

    it('should validate file upload restrictions', async () => {
      render(
        <RequestForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
        />
      );

      // Test file type validation
      const fileInput = screen.getByLabelText(/drop files/i);
      fireEvent.drop(fileInput, {
        dataTransfer: {
          files: [maliciousFile]
        }
      });

      expect(await screen.findByText(/invalid file type/i)).toBeInTheDocument();

      // Test file count validation
      const tooManyFiles = Array(FILE_UPLOAD_VALIDATION.MAX_FILES + 1)
        .fill(null)
        .map((_, i) => new File(['content'], `test${i}.pdf`, { type: 'application/pdf' }));

      fireEvent.drop(fileInput, {
        dataTransfer: {
          files: tooManyFiles
        }
      });

      expect(await screen.findByText(/maximum.*files allowed/i)).toBeInTheDocument();
    });
  });

  // Security tests
  describe('Security', () => {
    it('should sanitize file names for display', async () => {
      render(
        <RequestForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
        />
      );

      const maliciousFileName = '<script>alert("xss")</script>.pdf';
      const maliciousFile = new File(['content'], maliciousFileName, { type: 'application/pdf' });

      const fileInput = screen.getByLabelText(/drop files/i);
      fireEvent.drop(fileInput, {
        dataTransfer: {
          files: [maliciousFile]
        }
      });

      const fileList = await screen.findByRole('list', { name: /uploaded files/i });
      expect(fileList).not.toHaveTextContent(/<script>/i);
    });

    it('should prevent XSS in requirements text', async () => {
      const onSubmit = vi.fn();
      render(
        <RequestForm 
          onSubmit={onSubmit} 
          onCancel={vi.fn()} 
        />
      );

      const textArea = screen.getByRole('textbox', { name: /requirements/i });
      const maliciousText = '<script>alert("xss")</script>';
      
      await userEvent.type(textArea, maliciousText);
      await userEvent.click(screen.getByRole('button', { name: /submit/i }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          requirementsText: expect.not.stringContaining('<script>')
        })
      );
    });
  });

  // Error handling tests
  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      (createRequest as jest.Mock).mockRejectedValue(error);

      render(
        <ErrorBoundary>
          <RequestForm 
            onSubmit={vi.fn()} 
            onCancel={vi.fn()} 
          />
        </ErrorBoundary>
      );

      // Submit form with valid data
      const textArea = screen.getByRole('textbox', { name: /requirements/i });
      await userEvent.type(textArea, validRequest.requirementsText);
      await userEvent.click(screen.getByRole('button', { name: /submit/i }));

      // Verify error display
      expect(await screen.findByRole('alert')).toHaveTextContent(/error/i);
    });

    it('should recover from file upload errors', async () => {
      render(
        <RequestForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
        />
      );

      const fileInput = screen.getByLabelText(/drop files/i);
      
      // Simulate failed upload
      fireEvent.drop(fileInput, {
        dataTransfer: {
          files: [mockFile]
        }
      });

      // Verify retry button appears
      const retryButton = await screen.findByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Test retry functionality
      await userEvent.click(retryButton);
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  // Loading state tests
  describe('Loading States', () => {
    it('should disable form during submission', async () => {
      render(
        <RequestForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
          isSubmitting={true}
        />
      );

      const textArea = screen.getByRole('textbox', { name: /requirements/i });
      const fileInput = screen.getByLabelText(/drop files/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(textArea).toBeDisabled();
      expect(fileInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading indicators during file upload', async () => {
      render(
        <RequestForm 
          onSubmit={vi.fn()} 
          onCancel={vi.fn()} 
        />
      );

      const fileInput = screen.getByLabelText(/drop files/i);
      fireEvent.drop(fileInput, {
        dataTransfer: {
          files: [mockFile]
        }
      });

      expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    });
  });
});