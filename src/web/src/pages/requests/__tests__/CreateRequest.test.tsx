import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import CreateRequest from '../CreateRequest';
import { createRequest } from '../../../api/requests';
import { ROUTES } from '../../../constants/routes';
import { FILE_UPLOAD_VALIDATION, TEXT_INPUT_VALIDATION } from '../../../constants/validation';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn()
  };
});

vi.mock('react-hot-toast', () => ({
  success: vi.fn(),
  error: vi.fn()
}));

vi.mock('../../../api/requests', () => ({
  createRequest: vi.fn()
}));

// Test data
const validRequestData = {
  requirementsText: 'Test requirements with minimum length',
  documents: [
    new File(['test content'], 'test.pdf', { type: 'application/pdf' })
  ]
};

const invalidFileData = {
  oversizedFile: new File(['x'.repeat(15 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' }),
  invalidTypeFile: new File(['test content'], 'invalid.exe', { type: 'application/x-msdownload' })
};

// Helper function to render component with router context
const renderWithRouter = (ui: React.ReactElement, { route = '/requests/create' } = {}) => {
  const navigate = vi.fn();
  (useNavigate as jest.Mock).mockReturnValue(navigate);

  return {
    navigate,
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    )
  };
};

describe('CreateRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders request creation form with proper accessibility', async () => {
    const { user } = renderWithRouter(<CreateRequest />);

    // Check form elements presence and accessibility
    const form = screen.getByRole('form', { name: /create request/i });
    expect(form).toBeInTheDocument();

    const requirementsInput = screen.getByRole('textbox', { name: /requirements description/i });
    expect(requirementsInput).toBeInTheDocument();
    expect(requirementsInput).toHaveAttribute('aria-required', 'true');

    const fileUpload = screen.getByRole('button', { name: /drop files here or click to upload/i });
    expect(fileUpload).toBeInTheDocument();
    expect(fileUpload).toHaveAttribute('aria-describedby');

    // Test keyboard navigation
    await user.tab();
    expect(requirementsInput).toHaveFocus();

    await user.tab();
    expect(fileUpload).toHaveFocus();
  });

  it('handles form submission with loading state', async () => {
    const { user, navigate } = renderWithRouter(<CreateRequest />);
    (createRequest as jest.Mock).mockResolvedValueOnce({ id: '123' });

    // Fill form
    await user.type(
      screen.getByRole('textbox', { name: /requirements description/i }),
      validRequestData.requirementsText
    );

    // Upload file
    const fileInput = screen.getByLabelText(/upload files/i);
    await user.upload(fileInput, validRequestData.documents[0]);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit request/i });
    await user.click(submitButton);

    // Verify loading state
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/submitting/i);

    // Verify API call
    await waitFor(() => {
      expect(createRequest).toHaveBeenCalledWith(validRequestData);
    });

    // Verify success notification and navigation
    expect(toast.success).toHaveBeenCalledWith('Request created successfully');
    expect(navigate).toHaveBeenCalledWith(ROUTES.REQUESTS.LIST);
  });

  it('validates file upload restrictions comprehensively', async () => {
    const { user } = renderWithRouter(<CreateRequest />);

    // Test file size limit
    const fileInput = screen.getByLabelText(/upload files/i);
    await user.upload(fileInput, invalidFileData.oversizedFile);

    expect(screen.getByRole('alert')).toHaveTextContent(
      new RegExp(`exceeds maximum size of ${FILE_UPLOAD_VALIDATION.MAX_SIZE_MB}MB`, 'i')
    );

    // Test file type restriction
    await user.upload(fileInput, invalidFileData.invalidTypeFile);
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid file type/i);

    // Test multiple file limit
    const validFiles = Array(FILE_UPLOAD_VALIDATION.MAX_FILES + 1)
      .fill(null)
      .map((_, i) => new File(['content'], `test${i}.pdf`, { type: 'application/pdf' }));

    await user.upload(fileInput, validFiles);
    expect(screen.getByRole('alert')).toHaveTextContent(
      new RegExp(`maximum ${FILE_UPLOAD_VALIDATION.MAX_FILES} files allowed`, 'i')
    );
  });

  it('handles API errors gracefully', async () => {
    const { user } = renderWithRouter(<CreateRequest />);
    const errorMessage = 'Failed to create request';
    (createRequest as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    // Fill and submit form
    await user.type(
      screen.getByRole('textbox', { name: /requirements description/i }),
      validRequestData.requirementsText
    );
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    // Verify error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });
  });

  it('prompts for unsaved changes when navigating away', async () => {
    const { user, navigate } = renderWithRouter(<CreateRequest />);
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    // Make changes to form
    await user.type(
      screen.getByRole('textbox', { name: /requirements description/i }),
      'test'
    );

    // Try to navigate away
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(confirmSpy).toHaveBeenCalledWith(
      'You have unsaved changes. Are you sure you want to leave?'
    );
    expect(navigate).toHaveBeenCalledWith(ROUTES.REQUESTS.LIST);

    confirmSpy.mockRestore();
  });

  it('enforces text input validation rules', async () => {
    const { user } = renderWithRouter(<CreateRequest />);

    const requirementsInput = screen.getByRole('textbox', { name: /requirements description/i });

    // Test minimum length
    await user.type(requirementsInput, 'short');
    expect(screen.getByText(/requirements must be at least 10 characters/i)).toBeInTheDocument();

    // Test maximum length
    await user.type(requirementsInput, 'x'.repeat(TEXT_INPUT_VALIDATION.MAX_LENGTH + 1));
    expect(screen.getByText(new RegExp(`cannot exceed ${TEXT_INPUT_VALIDATION.MAX_LENGTH} characters`, 'i'))).toBeInTheDocument();
  });
});