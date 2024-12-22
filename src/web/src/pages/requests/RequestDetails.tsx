/**
 * @fileoverview Request Details page component for Arena MVP
 * @version 1.0.0
 * 
 * Displays comprehensive information about a software evaluation request with
 * real-time updates, accessibility features, and F-pattern layout design.
 */

import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom'; // v6.0.0
import { useQuery } from 'react-query'; // v4.0.0
import clsx from 'clsx'; // v2.0.0

// Internal components
import RequestStatus from '../../components/requests/RequestStatus';
import RequirementsList from '../../components/requests/RequirementsList';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Icon } from '../../components/common/Icon';

// Hooks and utilities
import { useWebSocket } from '../../hooks/useWebSocket';
import { buildEndpointUrl } from '../../constants/api';
import { parseApiError } from '../../utils/error';
import { IconName } from '../../assets/icons';

// Types
import { Request, RequestDocument } from '../../types/requests';
import { ErrorResponse } from '../../types/common';

// Constants for configuration
const REFETCH_INTERVAL = 30000; // 30 seconds
const CACHE_TIME = 300000; // 5 minutes

/**
 * Custom hook for managing request data with real-time updates
 */
const useRequestData = (requestId: string) => {
  const { data: authToken } = useQuery('authToken');
  
  // Set up WebSocket connection for real-time updates
  const { 
    subscribeToRequest, 
    isConnected: wsConnected 
  } = useWebSocket(authToken, {
    autoReconnect: true,
    debug: process.env.NODE_ENV === 'development'
  });

  // Fetch request data using react-query
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery<Request, ErrorResponse>(
    ['request', requestId],
    async () => {
      const response = await fetch(buildEndpointUrl(API_ENDPOINTS.REQUESTS.DETAIL, { id: requestId }));
      if (!response.ok) {
        throw await response.json();
      }
      return response.json();
    },
    {
      refetchInterval: REFETCH_INTERVAL,
      cacheTime: CACHE_TIME,
      staleTime: 5000,
      retry: 2
    }
  );

  // Subscribe to real-time updates
  useEffect(() => {
    if (!requestId || !wsConnected) return;

    const subscription = subscribeToRequest(requestId, {
      onMessage: (updatedData) => {
        refetch(); // Refetch data when update received
      },
      queueOfflineMessages: true
    });

    return () => subscription.unsubscribe();
  }, [requestId, wsConnected, subscribeToRequest, refetch]);

  return { data, isLoading, error, isRefetching };
};

/**
 * Document section component for displaying uploaded files
 */
const DocumentSection: React.FC<{ documents: RequestDocument[] }> = ({ documents }) => (
  <Card
    title="Supporting Documents"
    className="mt-6"
    aria-label="Supporting documents section"
  >
    <div className="space-y-3">
      {documents.length === 0 ? (
        <p className="text-gray-500 text-sm">No documents uploaded</p>
      ) : (
        documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
          >
            <div className="flex items-center gap-3">
              <Icon name={IconName.DOWNLOAD} size={24} />
              <div>
                <p className="text-sm font-medium">{doc.name}</p>
                <p className="text-xs text-gray-500">
                  {(doc.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Badge
              variant="info"
              size="sm"
              ariaLabel={`Security classification: ${doc.securityClassification}`}
            >
              {doc.securityClassification}
            </Badge>
          </div>
        ))
      )}
    </div>
  </Card>
);

/**
 * Main RequestDetails component implementing F-pattern layout
 */
const RequestDetails: React.FC = () => {
  const { id: requestId } = useParams<{ id: string }>();
  const { data, isLoading, error, isRefetching } = useRequestData(requestId!);

  // Memoize section visibility to prevent unnecessary re-renders
  const { showDocuments, showRequirements } = useMemo(() => ({
    showDocuments: data?.documents?.length > 0,
    showRequirements: data?.parsedRequirements && Object.keys(data.parsedRequirements).length > 0
  }), [data]);

  if (error) {
    return (
      <Alert 
        severity="error"
        title="Error Loading Request"
        className="m-4"
      >
        {error.message}
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-24 bg-gray-200 rounded" />
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <Alert 
        severity="warning"
        title="Request Not Found"
        className="m-4"
      >
        The requested evaluation could not be found.
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header Section - Top of F-pattern */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2">
              Software Evaluation Request
            </h1>
            <div className="flex items-center gap-3">
              <RequestStatus status={data.status} />
              {isRefetching && (
                <Badge variant="info" size="sm">
                  Updating...
                </Badge>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            ID: {data.id}
          </div>
        </div>

        {/* Main Content - Middle of F-pattern */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requirements Section - Left side */}
          <div className="lg:col-span-2">
            <RequirementsList
              request={data}
              className={clsx(
                'bg-white rounded-lg shadow',
                'transition-opacity duration-200',
                isRefetching && 'opacity-50'
              )}
              isLoading={isRefetching}
            />
          </div>

          {/* Status and Documents - Right side */}
          <div className="space-y-6">
            <Card
              title="Request Information"
              className="bg-white"
            >
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1">
                    {new Date(data.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Modified</dt>
                  <dd className="mt-1">
                    {new Date(data.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Version</dt>
                  <dd className="mt-1">{data.version}</dd>
                </div>
              </dl>
            </Card>

            {showDocuments && (
              <DocumentSection documents={data.documents} />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default RequestDetails;