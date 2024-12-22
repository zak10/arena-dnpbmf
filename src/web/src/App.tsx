/**
 * @fileoverview Root application component that sets up core infrastructure including
 * routing, state management, error boundaries, and global providers.
 * Implements enhanced error handling, performance monitoring, and accessibility features.
 * @version 1.0.0
 */

import React, { useEffect } from 'react'; // v18.0.0
import { Provider } from 'react-redux'; // v8.1.0
import * as Sentry from '@sentry/react'; // v7.0.0
import AppRoutes from './routes';
import ErrorBoundary from './components/common/ErrorBoundary';
import store from './store';
import { ErrorResponse } from './types/common';
import { uiActions } from './store/ui/uiSlice';

// Performance thresholds based on technical specifications
const PERFORMANCE_THRESHOLDS = {
  TIME_TO_INTERACTIVE: 3500, // 3.5s target
  FIRST_CONTENTFUL_PAINT: 1500, // 1.5s target
  API_RESPONSE_TIME: 500 // 500ms target
} as const;

// Error configuration based on technical specifications
const ERROR_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  ERROR_SEVERITY_LEVELS: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
} as const;

/**
 * Performance monitoring wrapper component
 */
const PerformanceMonitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Report performance metrics
    const reportPerformance = () => {
      const metrics = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const tti = performance.getEntriesByName('time-to-interactive')[0];

      // Check against thresholds
      if (fcp && fcp.startTime > PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT) {
        console.warn('FCP exceeds threshold:', fcp.startTime);
      }
      if (tti && tti.startTime > PERFORMANCE_THRESHOLDS.TIME_TO_INTERACTIVE) {
        console.warn('TTI exceeds threshold:', tti.startTime);
      }

      // Report to monitoring service
      Sentry.setTag('performance.fcp', fcp?.startTime);
      Sentry.setTag('performance.tti', tti?.startTime);
      Sentry.setTag('performance.load', metrics.loadEventEnd);
    };

    // Observe performance metrics
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `${entry.name}: ${entry.startTime}`,
          level: 'info'
        });
      });
    });

    observer.observe({ entryTypes: ['navigation', 'paint', 'longtask'] });

    // Report metrics when page is fully loaded
    window.addEventListener('load', reportPerformance);

    return () => {
      observer.disconnect();
      window.removeEventListener('load', reportPerformance);
    };
  }, []);

  return <>{children}</>;
};

/**
 * Error handler for uncaught errors and rejections
 */
const setupErrorHandlers = () => {
  window.addEventListener('unhandledrejection', (event) => {
    const error: ErrorResponse = {
      code: 'E4001',
      message: event.reason?.message || 'Unhandled Promise Rejection',
      details: { stack: event.reason?.stack },
      severity: 'ERROR'
    };

    // Dispatch error to Redux store
    store.dispatch(uiActions.addNotification({
      message: error.message,
      severity: 'error',
      autoHide: false
    }));

    // Report to error tracking service
    Sentry.captureException(event.reason);
  });

  window.addEventListener('error', (event) => {
    const error: ErrorResponse = {
      code: 'E4001',
      message: event.error?.message || 'Uncaught Error',
      details: { stack: event.error?.stack },
      severity: 'CRITICAL'
    };

    // Dispatch error to Redux store
    store.dispatch(uiActions.addNotification({
      message: error.message,
      severity: 'error',
      autoHide: false
    }));

    // Report to error tracking service
    Sentry.captureException(event.error);
  });
};

/**
 * Root application component with enhanced error handling and performance monitoring
 */
const App: React.FC = () => {
  useEffect(() => {
    setupErrorHandlers();
  }, []);

  return (
    <Provider store={store}>
      <ErrorBoundary
        fallback={({ error }) => (
          <div role="alert" className="error-boundary-fallback">
            <h1>Application Error</h1>
            <p>{error?.message || 'An unexpected error occurred.'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="retry-button"
            >
              Retry
            </button>
          </div>
        )}
      >
        <PerformanceMonitor>
          <AppRoutes />
        </PerformanceMonitor>
      </ErrorBoundary>
    </Provider>
  );
};

// Configure Sentry for error tracking
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ['localhost', process.env.REACT_APP_API_URL || '']
    })
  ]
});

export default App;