import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import RequestForm from '../../components/requests/RequestForm';
import { createRequest } from '../../api/requests';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../hooks/useAuth';
import { ErrorResponse } from '../../types/common';
import { RequestFormData } from '../../types/requests';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import Alert from '../../components/common/Alert';

/**
 * Interface for component state management
 */
interface CreateRequestState {
  isSubmitting: boolean;
  hasUnsavedChanges: boolean;
  currentStep: number;
  error: ErrorResponse | null;
}

/**
 * CreateRequest page component that implements a secure, accessible request creation interface
 * with multi-step form flow, validation, and error handling.
 */
const CreateRequest: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Component state
  const [state, setState] = useState<CreateRequestState>({
    isSubmitting: false,
    hasUnsavedChanges: false,
    currentStep: 1,
    error: null
  });

  /**
   * Handles form submission with validation and error handling
   */
  const handleSubmit = useCallback(async (data: RequestFormData) => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Create new request
      await createRequest({
        requirementsText: data.requirementsText,
        documents: data.documents
      });

      // Show success message
      toast.success('Request created successfully');

      // Reset form state
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        hasUnsavedChanges: false
      }));

      // Navigate to requests list
      navigate(ROUTES.REQUESTS.LIST);

    } catch (error) {
      // Handle error
      const apiError = error as ErrorResponse;
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: apiError
      }));

      toast.error(apiError.message || 'Failed to create request');
    }
  }, [navigate]);

  /**
   * Handles form cancellation with unsaved changes check
   */
  const handleCancel = useCallback(() => {
    if (state.hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }

    navigate(ROUTES.REQUESTS.LIST);
  }, [navigate, state.hasUnsavedChanges]);

  /**
   * Check authentication status on mount
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.AUTH.LOGIN, {
        state: { from: ROUTES.REQUESTS.CREATE }
      });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Prompt user about unsaved changes when leaving
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  return (
    <Layout>
      <ErrorBoundary>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8 space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Create New Request
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Describe your software requirements and upload any supporting documents.
            </p>
          </div>

          {/* Error Alert */}
          {state.error && (
            <Alert
              severity="error"
              title="Error"
              className="mb-6"
              dismissible
              onDismiss={() => setState(prev => ({ ...prev, error: null }))}
            >
              {state.error.message}
            </Alert>
          )}

          {/* Request Form */}
          <div className="bg-white shadow rounded-lg">
            <RequestForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={state.isSubmitting}
              onChange={() => setState(prev => ({ ...prev, hasUnsavedChanges: true }))}
            />
          </div>
        </div>
      </ErrorBoundary>
    </Layout>
  );
};

// Export with error boundary wrapper
export default function WrappedCreateRequest() {
  return (
    <ErrorBoundary fallback={
      <Alert severity="error" title="Error">
        Failed to load request creation form. Please try refreshing the page.
      </Alert>
    }>
      <CreateRequest />
    </ErrorBoundary>
  );
}