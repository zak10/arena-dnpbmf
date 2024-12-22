/**
 * @fileoverview Enhanced form component for creating secure software evaluation requests
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form'; // v7.45.0
import * as yup from 'yup'; // v1.2.0
import classNames from 'classnames'; // v2.3.2
import TextArea from '../common/TextArea';
import FileUpload from '../common/FileUpload';
import { createRequest } from '../../api/requests';
import ErrorBoundary from '../common/ErrorBoundary';
import { FILE_UPLOAD_VALIDATION, TEXT_INPUT_VALIDATION } from '../../constants/validation';
import { RequestDocument } from '../../types/requests';

/**
 * Validation schema for request form data
 */
const requestFormSchema = yup.object().shape({
  requirementsText: yup
    .string()
    .required('Requirements description is required')
    .min(10, 'Requirements must be at least 10 characters')
    .max(TEXT_INPUT_VALIDATION.MAX_LENGTH, `Requirements cannot exceed ${TEXT_INPUT_VALIDATION.MAX_LENGTH} characters`),
  documents: yup
    .array()
    .of(
      yup.mixed().test('fileType', 'Invalid file type', (file: File) => {
        return FILE_UPLOAD_VALIDATION.ALLOWED_TYPES.includes(file.type);
      })
    )
    .max(FILE_UPLOAD_VALIDATION.MAX_FILES, `Maximum ${FILE_UPLOAD_VALIDATION.MAX_FILES} files allowed`)
});

/**
 * Interface for form data structure
 */
interface RequestFormData {
  requirementsText: string;
  documents: File[];
}

/**
 * Props interface for the RequestForm component
 */
interface RequestFormProps {
  onSubmit: (request: RequestFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<RequestFormData>;
}

/**
 * Enhanced form component for creating secure software evaluation requests
 * with comprehensive validation, security measures, and accessibility features.
 */
const RequestForm: React.FC<RequestFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData
}) => {
  // Form state management with react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch
  } = useForm<RequestFormData>({
    defaultValues: {
      requirementsText: initialData?.requirementsText || '',
      documents: initialData?.documents || []
    },
    mode: 'onChange',
    resolver: yup.resolver(requestFormSchema)
  });

  // Local state for file upload tracking
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Watch form values for validation
  const documents = watch('documents');

  /**
   * Handles secure file selection with validation
   */
  const handleFileSelect = useCallback(async (files: File[]) => {
    try {
      setUploadError(null);
      
      // Validate total number of files
      const totalFiles = (documents || []).length + files.length;
      if (totalFiles > FILE_UPLOAD_VALIDATION.MAX_FILES) {
        throw new Error(`Maximum ${FILE_UPLOAD_VALIDATION.MAX_FILES} files allowed`);
      }

      // Validate each file
      files.forEach(file => {
        if (file.size > FILE_UPLOAD_VALIDATION.MAX_SIZE_MB * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds maximum size of ${FILE_UPLOAD_VALIDATION.MAX_SIZE_MB}MB`);
        }
        if (!FILE_UPLOAD_VALIDATION.ALLOWED_TYPES.includes(file.type)) {
          throw new Error(`File "${file.name}" has invalid type. Accepted types: ${FILE_UPLOAD_VALIDATION.ALLOWED_TYPES.join(', ')}`);
        }
      });

      // Update form state with validated files
      setValue('documents', [...(documents || []), ...files], { shouldValidate: true });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'File upload failed');
    }
  }, [documents, setValue]);

  /**
   * Handles secure file removal
   */
  const handleFileRemove = useCallback(async (fileId: string) => {
    const updatedFiles = documents?.filter(file => file.name !== fileId) || [];
    setValue('documents', updatedFiles, { shouldValidate: true });
  }, [documents, setValue]);

  /**
   * Handles form submission with validation and security measures
   */
  const onFormSubmit = async (data: RequestFormData) => {
    try {
      setUploadError(null);
      
      // Create form data for secure file upload
      const formData = new FormData();
      formData.append('requirementsText', data.requirementsText);
      
      // Append validated files
      data.documents?.forEach(file => {
        formData.append('documents', file);
      });

      // Submit form data
      await onSubmit(data);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Form submission failed');
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 relative">
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className={classNames(
            'flex flex-col gap-6',
            isSubmitting && 'opacity-50 pointer-events-none'
          )}
          noValidate
        >
          {/* Requirements Text Input */}
          <TextArea
            id="requirementsText"
            label="Requirements Description"
            error={errors.requirementsText?.message}
            hint="Describe your software requirements in detail"
            required
            rows={6}
            maxLength={TEXT_INPUT_VALIDATION.MAX_LENGTH}
            showCharacterCount
            {...register('requirementsText')}
          />

          {/* File Upload Section */}
          <FileUpload
            onFilesSelected={handleFileSelect}
            onFileRemoved={handleFileRemove}
            onError={setUploadError}
            maxFiles={FILE_UPLOAD_VALIDATION.MAX_FILES}
            maxSizeBytes={FILE_UPLOAD_VALIDATION.MAX_SIZE_MB * 1024 * 1024}
            acceptedFileTypes={FILE_UPLOAD_VALIDATION.ALLOWED_TYPES}
            disabled={isSubmitting}
          />

          {/* Error Display */}
          {uploadError && (
            <div
              className="text-red-600 text-sm"
              role="alert"
            >
              {uploadError}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={classNames(
                'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md',
                'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

        {/* Loading Overlay */}
        {isSubmitting && (
          <div
            className="absolute inset-0 bg-white/50 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default RequestForm;