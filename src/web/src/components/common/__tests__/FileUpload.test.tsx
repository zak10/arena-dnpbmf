import React from 'react'; // v18.0.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { vi } from 'vitest'; // v0.34.0
import FileUpload from '../FileUpload';
import { IconName } from '../../../assets/icons';

// Mock functions
const mockOnFilesSelected = vi.fn();
const mockOnFileRemoved = vi.fn();
const mockOnError = vi.fn();

// Default props
const defaultProps = {
  onFilesSelected: mockOnFilesSelected,
  onFileRemoved: mockOnFileRemoved,
  onError: mockOnError,
  maxFiles: 5,
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  acceptedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
};

/**
 * Creates a mock File object for testing
 */
const createMockFile = (name: string, size: number, type: string): File => {
  const buffer = new ArrayBuffer(size);
  const blob = new Blob([buffer], { type });
  return new File([blob], name, { type });
};

describe('FileUpload Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    // Reset file input value between tests
    if (document.querySelector('input[type="file"]')) {
      (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Accessibility', () => {
    it('renders upload area with correct text and accessibility features', () => {
      render(<FileUpload {...defaultProps} />);

      // Check for visible elements
      expect(screen.getByText(/Drop files here or click to upload/i)).toBeInTheDocument();
      expect(screen.getByText(/Supports:/i)).toBeInTheDocument();
      
      // Check accessibility attributes
      const dropZone = screen.getByRole('button');
      expect(dropZone).toHaveAttribute('tabIndex', '0');
      expect(dropZone).toHaveAttribute('aria-describedby');
      
      // Check for upload icon
      const uploadIcon = screen.getByTestId(`icon-${IconName.UPLOAD}`);
      expect(uploadIcon).toBeInTheDocument();
    });

    it('handles disabled state correctly', () => {
      render(<FileUpload {...defaultProps} disabled />);
      
      const dropZone = screen.getByRole('button');
      expect(dropZone).toHaveAttribute('aria-disabled', 'true');
      expect(dropZone).toHaveAttribute('tabIndex', '-1');
      expect(screen.getByRole('button', { name: /select files/i })).toBeDisabled();
    });
  });

  describe('File Selection', () => {
    it('handles valid file selection through input', async () => {
      render(<FileUpload {...defaultProps} />);

      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              file: expect.objectContaining({ name: 'test.pdf' }),
              status: 'pending'
            })
          ])
        );
      });
    });

    it('validates file size with appropriate error messages', async () => {
      render(<FileUpload {...defaultProps} />);

      const oversizedFile = createMockFile('large.pdf', 11 * 1024 * 1024, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await user.upload(input, oversizedFile);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'FILE_TOO_LARGE',
            message: expect.stringContaining('10MB')
          })
        );
      });
    });

    it('validates file types with clear feedback', async () => {
      render(<FileUpload {...defaultProps} />);

      const invalidFile = createMockFile('test.txt', 1024, 'text/plain');
      const input = screen.getByTestId('file-input');

      await user.upload(input, invalidFile);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'INVALID_FILE_TYPE',
            message: expect.stringContaining('.pdf, .doc, .docx, .xls, .xlsx')
          })
        );
      });
    });
  });

  describe('Drag and Drop', () => {
    it('handles drag and drop with visual feedback', async () => {
      render(<FileUpload {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');

      // Test drag enter
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { files: [file] }
      });
      expect(dropZone).toHaveClass('border-blue-500');

      // Test drag leave
      fireEvent.dragLeave(dropZone);
      expect(dropZone).not.toHaveClass('border-blue-500');

      // Test drop
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] }
      });

      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              file: expect.objectContaining({ name: 'test.pdf' })
            })
          ])
        );
      });
    });

    it('prevents drop when disabled', async () => {
      render(<FileUpload {...defaultProps} disabled />);

      const dropZone = screen.getByRole('button');
      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] }
      });

      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });
  });

  describe('File Management', () => {
    it('enforces max files limit with user feedback', async () => {
      render(<FileUpload {...defaultProps} />);

      const files = Array.from({ length: 6 }, (_, i) => 
        createMockFile(`test${i}.pdf`, 1024 * 1024, 'application/pdf')
      );

      const input = screen.getByTestId('file-input');
      await user.upload(input, files);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'MAX_FILES_EXCEEDED',
            message: expect.stringContaining('Maximum 5 files allowed')
          })
        );
      });
    });

    it('handles file removal with keyboard support', async () => {
      render(<FileUpload {...defaultProps} />);

      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);
      
      const removeButton = await screen.findByRole('button', { name: /remove test.pdf/i });
      
      // Test keyboard interaction
      await user.tab();
      expect(removeButton).toHaveFocus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnFileRemoved).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles file removal errors with retry logic', async () => {
      const error = new Error('Network error');
      mockOnFileRemoved.mockRejectedValueOnce(error);

      render(<FileUpload {...defaultProps} />);

      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);
      const removeButton = await screen.findByRole('button', { name: /remove test.pdf/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'REMOVE_ERROR',
            message: 'Failed to remove file'
          })
        );
      });
    });

    it('handles upload errors gracefully', async () => {
      mockOnFilesSelected.mockRejectedValueOnce(new Error('Upload failed'));

      render(<FileUpload {...defaultProps} />);

      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'SELECTION_ERROR',
            message: 'Failed to process selected files'
          })
        );
      });
    });
  });
});