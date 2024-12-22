/**
 * @fileoverview Entry point for the Arena MVP React application
 * Implements React 18 features, global styles, core providers, error boundaries,
 * and performance monitoring based on technical specifications.
 * @version 1.0.0
 */

import React from 'react'; // v18.0.0
import { createRoot } from 'react-dom/client'; // v18.0.0
import { reportWebVitals } from 'web-vitals'; // v3.0.0
import App from './App';

// Import global styles
import './styles/global.css';
import './styles/tailwind.css';

// Performance thresholds from technical specifications
const PERFORMANCE_THRESHOLDS = {
  FIRST_CONTENTFUL_PAINT: 1500, // 1.5s target
  TIME_TO_INTERACTIVE: 3500, // 3.5s target
  API_RESPONSE_TIME: 500 // 500ms target
} as const;

/**
 * Browser support check based on technical specifications
 */
const checkBrowserSupport = (): void => {
  const userAgent = window.navigator.userAgent;
  const browserVersions = {
    chrome: 90,
    firefox: 88,
    safari: 14,
    edge: 90
  };

  // Only check in development to avoid blocking users in production
  if (process.env.NODE_ENV === 'development') {
    const isSupported = (
      // Chrome
      (/Chrome\/([0-9]+)/.test(userAgent) && 
        parseInt(RegExp.$1) >= browserVersions.chrome) ||
      // Firefox
      (/Firefox\/([0-9]+)/.test(userAgent) && 
        parseInt(RegExp.$1) >= browserVersions.firefox) ||
      // Safari
      (/Version\/([0-9]+)/.test(userAgent) && 
        parseInt(RegExp.$1) >= browserVersions.safari) ||
      // Edge
      (/Edg\/([0-9]+)/.test(userAgent) && 
        parseInt(RegExp.$1) >= browserVersions.edge)
    );

    if (!isSupported) {
      console.warn('Browser version may not be fully supported. Please upgrade for best experience.');
    }
  }
};

/**
 * Initializes performance monitoring and reports metrics
 */
const initializePerformanceMonitoring = (): void => {
  // Observe Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const value = entry.startTime;
      const name = entry.name;

      // Check against thresholds
      if (name === 'first-contentful-paint' && 
          value > PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT) {
        console.warn(`FCP exceeded threshold: ${value}ms`);
      }
      if (name === 'time-to-interactive' && 
          value > PERFORMANCE_THRESHOLDS.TIME_TO_INTERACTIVE) {
        console.warn(`TTI exceeded threshold: ${value}ms`);
      }
    });
  });

  observer.observe({ entryTypes: ['paint', 'measure'] });
};

/**
 * Reports Core Web Vitals metrics to analytics
 */
const reportMetrics = (metric: any): void => {
  // Log metrics in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric);
  }

  // Send metrics to analytics service
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id
  });

  // Use sendBeacon for reliable metric reporting
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/v1/analytics/vitals', body);
  } else {
    fetch('/api/v1/analytics/vitals', {
      body,
      method: 'POST',
      keepalive: true
    });
  }
};

/**
 * Initialize the application with all required setup
 */
const initializeApp = (): void => {
  // Check browser compatibility
  checkBrowserSupport();

  // Initialize performance monitoring
  initializePerformanceMonitoring();

  // Get root element
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found. Please check your HTML file.');
  }

  // Create React 18 root and render app
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Report web vitals
  reportWebVitals(reportMetrics);
};

// Initialize the application
initializeApp();

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    initializeApp();
  });
}