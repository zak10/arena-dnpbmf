import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { Button } from './Button';
import { Icon } from './Icon';
import { IconName } from '../../assets/icons';

// File upload related interfaces
interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'error' | 'complete';
  errorMessage?: string;
}

interface FileUploadError {
  code: string;
  message: string;
  files?: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: FileUploadError[];
  validFiles: File[];
}

// Component props interface
interface FileUploadProps {
  onFilesSelected: (files: FileUploadItem[]) => Promise<void>;
  onFileRemoved: (fileId: string) => Promise<void>;
  onError: (error: FileUploadError) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedFileTypes?: string[];
  disabled?: boolean;
  chunkSize?: number;
}

// Constants
const DRAG_OVER_CLASS = 'border-blue-500 bg-blue-50 ring-2 ring-blue-200';
const FILE_TYPE_ICONS: Record<string, IconName> = {
  pdf: IconName.DOWNLOAD,
  doc: IconName.DOWNLOAD,
  docx: IconName.DOWNLOAD,
  xls: IconName.DOWNLOAD,
  xlsx: IconName.DOWNLOAD
};

const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffMs: 1000,
  timeoutMs: 30000
};

/**
 * Enterprise-grade file upload component with drag-and-drop support,
 * accessibility features, and comprehensive validation.
 */
const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  onFileRemoved,
  onError,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  disabled = false,
  chunkSize = 1024 * 1024 // 1MB chunks
}) => {
  // State management
  const [dragOver, setDragOver] = React.useState(false);
  const [files, setFiles] = React.useState<FileUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  // Refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);
  
  // Generate unique IDs for accessibility
  const dropzoneId = React.useId();
  const fileListId = React.useId();
  const statusId = React.useId();

  /**
   * Validates files against size, type, and quantity restrictions
   */
  const validateFiles = async (newFiles: File[]): Promise<ValidationResult> => {
    const errors: FileUploadError[] = [];
    const validFiles: File[] = [];

    // Check if adding new files would exceed limit
    if (files.length + newFiles.length > maxFiles) {
      errors.push({
        code: 'MAX_FILES_EXCEEDED',
        message: `Maximum ${maxFiles} files allowed`,
      });
      return { valid: false, errors, validFiles };
    }

    for (const file of newFiles) {
      // Check file size
      if (file.size > maxSizeBytes) {
        errors.push({
          code: 'FILE_TOO_LARGE',
          message: `File "${file.name}" exceeds maximum size of ${maxSizeBytes / 1024 / 1024}MB`,
          files: [file.name]
        });
        continue;
      }

      // Check file type
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptedFileTypes.includes(fileExtension)) {
        errors.push({
          code: 'INVALID_FILE_TYPE',
          message: `File "${file.name}" has invalid type. Accepted types: ${acceptedFileTypes.join(', ')}`,
          files: [file.name]
        });
        continue;
      }

      validFiles.push(file);
    }

    return {
      valid: errors.length === 0,
      errors,
      validFiles
    };
  };

  /**
   * Handles file drop events with enhanced error handling
   */
  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (disabled || isProcessing) return;

    setDragOver(false);
    setIsProcessing(true);

    try {
      const droppedFiles = Array.from(event.dataTransfer.files);
      const validation = await validateFiles(droppedFiles);

      if (!validation.valid) {
        validation.errors.forEach(onError);
        return;
      }

      const newFileItems: FileUploadItem[] = validation.validFiles.map(file => ({
        id: `${file.name}-${Date.now()}`,
        file,
        progress: 0,
        status: 'pending'
      }));

      setFiles(prev => [...prev, ...newFileItems]);
      await onFilesSelected(newFileItems);

    } catch (error) {
      onError({
        code: 'DROP_ERROR',
        message: 'Failed to process dropped files',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles file selection through input with accessibility support
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isProcessing || !event.target.files?.length) return;

    setIsProcessing(true);

    try {
      const selectedFiles = Array.from(event.target.files);
      const validation = await validateFiles(selectedFiles);

      if (!validation.valid) {
        validation.errors.forEach(onError);
        return;
      }

      const newFileItems: FileUploadItem[] = validation.validFiles.map(file => ({
        id: `${file.name}-${Date.now()}`,
        file,
        progress: 0,
        status: 'pending'
      }));

      setFiles(prev => [...prev, ...newFileItems]);
      await onFilesSelected(newFileItems);

    } catch (error) {
      onError({
        code: 'SELECTION_ERROR',
        message: 'Failed to process selected files',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Handles file removal with retry logic
   */
  const handleRemoveFile = async (fileId: string) => {
    let attempts = 0;
    
    while (attempts < RETRY_CONFIG.maxAttempts) {
      try {
        await onFileRemoved(fileId);
        setFiles(prev => prev.filter(f => f.id !== fileId));
        return;
      } catch (error) {
        attempts++;
        if (attempts === RETRY_CONFIG.maxAttempts) {
          onError({
            code: 'REMOVE_ERROR',
            message: 'Failed to remove file',
          });
        }
        await new Promise(resolve => 
          setTimeout(resolve, RETRY_CONFIG.backoffMs * attempts)
        );
      }
    }
  };

  // Drag event handlers
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled && !isProcessing) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  // Accessibility keyboard handlers
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileSelect}
        disabled={disabled || isProcessing}
        className="hidden"
        aria-hidden="true"
      />

      {/* Drop zone */}
      <div
        ref={dropZoneRef}
        id={dropzoneId}
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={clsx(
          'relative w-full p-8 border-2 border-dashed rounded-lg',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer',
          dragOver ? DRAG_OVER_CLASS : 'border-gray-300 hover:border-blue-400'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        aria-disabled={disabled}
        aria-describedby={statusId}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <Icon
            name={IconName.UPLOAD}
            size={40}
            className={clsx(
              'text-gray-400',
              disabled && 'opacity-50'
            )}
          />
          <div className="text-center">
            <p className="text-base font-medium text-gray-700">
              Drop files here or click to upload
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {`Supports: ${acceptedFileTypes.join(', ')} up to ${maxSizeBytes / 1024 / 1024}MB`}
            </p>
          </div>
          <Button
            variant="outline"
            size="medium"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
            leftIcon={IconName.UPLOAD}
          >
            Select Files
          </Button>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul
          id={fileListId}
          className="mt-4 space-y-2"
          aria-label="Uploaded files"
        >
          {files.map(file => (
            <li
              key={file.id}
              className={clsx(
                'flex items-center justify-between',
                'p-3 rounded-lg border',
                file.status === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-200'
              )}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  name={FILE_TYPE_ICONS[file.file.name.split('.').pop()?.toLowerCase() || ''] || IconName.DOWNLOAD}
                  size={24}
                  className="text-gray-400"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {`${(file.file.size / 1024).toFixed(1)} KB`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="small"
                onClick={() => handleRemoveFile(file.id)}
                leftIcon={IconName.REMOVE}
                aria-label={`Remove ${file.file.name}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Status messages for screen readers */}
      <div
        id={statusId}
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        {isProcessing ? 'Processing files...' : `${files.length} files uploaded`}
      </div>
    </div>
  );
};

/**
 * Error boundary for production resilience
 */
class FileUploadErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 rounded-lg">
          <p className="text-red-600">Failed to load file upload component</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary
export default React.memo(function WrappedFileUpload(props: FileUploadProps) {
  return (
    <FileUploadErrorBoundary>
      <FileUpload {...props} />
    </FileUploadErrorBoundary>
  );
});