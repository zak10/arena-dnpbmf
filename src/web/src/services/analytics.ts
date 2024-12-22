/**
 * @fileoverview Privacy-focused analytics service using Google Analytics
 * Implements GDPR compliance, consent management, and enhanced type safety
 * @version 1.0.0
 */

import { APP_CONFIG } from '../constants/common';

// Google Analytics types
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'consent' | 'set',
      target: string,
      config?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
  }
}

// Analytics configuration
const GA_TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID;
const IS_PRODUCTION = APP_CONFIG.ENV === 'production';
const CONSENT_COOKIE_NAME = 'arena_analytics_consent';

// Event category types for strict typing
type EventCategory = 
  | 'Request'
  | 'Proposal'
  | 'User'
  | 'System'
  | 'Error';

// Analytics error types
class AnalyticsError extends Error {
  constructor(message: string) {
    super(`Analytics Error: ${message}`);
    this.name = 'AnalyticsError';
  }
}

/**
 * Loads the Google Analytics script dynamically
 * @returns Promise that resolves when script is loaded
 */
const loadAnalyticsScript = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="gtag.js"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    script.onerror = () => reject(new AnalyticsError('Failed to load analytics script'));
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

/**
 * Initializes Google Analytics with privacy-focused configuration
 */
const initializeAnalytics = async (): Promise<void> => {
  try {
    if (!IS_PRODUCTION || !GA_TRACKING_ID) {
      console.debug('Analytics disabled: Development environment or missing tracking ID');
      return;
    }

    await loadAnalyticsScript();

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    // Initialize with strict privacy settings
    window.gtag('config', GA_TRACKING_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      restricted_data_processing: true,
      storage: 'none',
      client_storage: 'none',
      cookie_expires: 0
    });

    // Set default consent state
    const hasConsent = getCookieConsent();
    setConsentStatus(hasConsent);

  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    throw new AnalyticsError('Initialization failed');
  }
};

/**
 * Tracks page views with PII protection
 * @param path - Page path
 * @param title - Page title
 */
const trackPageView = async (path: string, title: string): Promise<void> => {
  try {
    if (!window.gtag || !hasAnalyticsConsent()) {
      return;
    }

    const sanitizedPath = sanitizeTrackingData({ path }).path as string;
    
    window.gtag('event', 'page_view', {
      page_path: sanitizedPath,
      page_title: title,
      send_to: GA_TRACKING_ID
    });

    if (!IS_PRODUCTION) {
      console.debug('Page view tracked:', { path: sanitizedPath, title });
    }

  } catch (error) {
    console.error('Failed to track page view:', error);
    throw new AnalyticsError('Page view tracking failed');
  }
};

/**
 * Tracks custom events with validation
 * @param category - Event category
 * @param action - Event action
 * @param label - Optional event label
 * @param value - Optional numeric value
 */
const trackEvent = async (
  category: EventCategory,
  action: string,
  label?: string,
  value?: number
): Promise<void> => {
  try {
    if (!window.gtag || !hasAnalyticsConsent()) {
      return;
    }

    // Validate parameters
    if (!category || !action) {
      throw new AnalyticsError('Missing required event parameters');
    }

    if (value !== undefined && !Number.isFinite(value)) {
      throw new AnalyticsError('Invalid event value');
    }

    const sanitizedData = sanitizeTrackingData({
      event_category: category,
      event_action: action,
      event_label: label,
      value
    });

    window.gtag('event', action, {
      ...sanitizedData,
      send_to: GA_TRACKING_ID
    });

    if (!IS_PRODUCTION) {
      console.debug('Event tracked:', sanitizedData);
    }

  } catch (error) {
    console.error('Failed to track event:', error);
    throw new AnalyticsError('Event tracking failed');
  }
};

/**
 * Updates user consent status for analytics
 * @param granted - Whether consent is granted
 */
const setConsentStatus = (granted: boolean): void => {
  try {
    // Update consent cookie with secure flags
    document.cookie = `${CONSENT_COOKIE_NAME}=${granted}; path=/; secure; samesite=strict; max-age=31536000`;

    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied'
      });
    }

    if (!granted) {
      // Clear any existing analytics data
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        if (cookie.includes('_ga') || cookie.includes('_gid')) {
          const name = cookie.split('=')[0].trim();
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        }
      }
    }

  } catch (error) {
    console.error('Failed to update consent status:', error);
    throw new AnalyticsError('Consent update failed');
  }
};

/**
 * Removes PII from tracking data
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
const sanitizeTrackingData = (data: Record<string, unknown>): Record<string, unknown> => {
  const sanitized = { ...data };

  const piiPatterns = {
    email: /[^@\s]+@[^@\s]+\.[^@\s]+/g,
    phone: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    ssn: /\d{3}-\d{2}-\d{4}/g
  };

  // Recursively sanitize objects
  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      let sanitizedValue = value;
      // Remove PII patterns
      Object.values(piiPatterns).forEach(pattern => {
        sanitizedValue = sanitizedValue.replace(pattern, '[REDACTED]');
      });
      return sanitizedValue;
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      return sanitizeTrackingData(value as Record<string, unknown>);
    }
    return value;
  };

  // Sanitize all values
  Object.entries(sanitized).forEach(([key, value]) => {
    sanitized[key] = sanitizeValue(value);
  });

  return sanitized;
};

/**
 * Checks if analytics consent is granted
 * @returns Whether consent is granted
 */
const hasAnalyticsConsent = (): boolean => {
  const consent = document.cookie
    .split(';')
    .find(c => c.trim().startsWith(CONSENT_COOKIE_NAME));
  return consent?.includes('true') ?? false;
};

/**
 * Gets current cookie consent status
 * @returns Whether consent is granted
 */
const getCookieConsent = (): boolean => {
  return hasAnalyticsConsent();
};

// Export analytics service
export const analytics = {
  initializeAnalytics,
  trackPageView,
  trackEvent,
  setConsentStatus
};