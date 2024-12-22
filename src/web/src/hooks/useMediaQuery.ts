/**
 * @fileoverview Custom React hooks for handling responsive design media queries
 * Provides performant and type-safe viewport size detection with SSR compatibility
 * @version 1.0.0
 */

import { useState, useEffect, useMemo } from 'react'; // v18.0.0
import { debounce } from 'lodash'; // v4.17.21
import { UI_CONFIG } from '../constants/common';

/**
 * Type guard to check if window is defined for SSR safety
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Type for media query event handler
 */
type MediaQueryEventHandler = (event: MediaQueryListEvent) => void;

/**
 * Debounce delay for resize events in milliseconds
 */
const RESIZE_DEBOUNCE_DELAY = 100;

/**
 * Custom hook for checking if a media query matches
 * Optimized for performance with debounced updates and SSR compatibility
 * 
 * @param query - Media query string to evaluate
 * @returns boolean indicating if the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  // Validate query parameter
  if (typeof query !== 'string' || !query.trim()) {
    throw new Error('Media query must be a non-empty string');
  }

  // Create memoized media query list for performance
  const mediaQueryList = useMemo(() => {
    return isBrowser ? window.matchMedia(query) : null;
  }, [query]);

  // Initialize state with SSR-safe default value
  const [matches, setMatches] = useState<boolean>(() => {
    return isBrowser ? mediaQueryList?.matches ?? false : false;
  });

  useEffect(() => {
    if (!isBrowser || !mediaQueryList) {
      return;
    }

    // Create debounced handler for performance optimization
    const debouncedHandler = debounce<MediaQueryEventHandler>((event) => {
      setMatches(event.matches);
    }, RESIZE_DEBOUNCE_DELAY);

    // Modern browsers use addEventListener
    const updateMatches = (e: MediaQueryListEvent) => {
      debouncedHandler(e);
    };

    // Add event listener with browser compatibility check
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', updateMatches);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(updateMatches);
    }

    // Set initial value
    setMatches(mediaQueryList.matches);

    // Cleanup event listeners and debounced handler
    return () => {
      debouncedHandler.cancel();
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', updateMatches);
      } else {
        // Fallback cleanup for older browsers
        mediaQueryList.removeListener(updateMatches);
      }
    };
  }, [mediaQueryList]);

  return matches;
};

/**
 * Hook for detecting mobile viewport
 * @returns boolean indicating if viewport is mobile size
 */
export const useIsMobile = (): boolean => {
  const query = useMemo(() => {
    return `(max-width: ${UI_CONFIG.BREAKPOINTS.TABLET - 1}px)`;
  }, []);
  
  return useMediaQuery(query);
};

/**
 * Hook for detecting tablet viewport
 * @returns boolean indicating if viewport is tablet size
 */
export const useIsTablet = (): boolean => {
  const query = useMemo(() => {
    return `(min-width: ${UI_CONFIG.BREAKPOINTS.TABLET}px) and (max-width: ${UI_CONFIG.BREAKPOINTS.DESKTOP - 1}px)`;
  }, []);
  
  return useMediaQuery(query);
};

/**
 * Hook for detecting desktop viewport
 * @returns boolean indicating if viewport is desktop size
 */
export const useIsDesktop = (): boolean => {
  const query = useMemo(() => {
    return `(min-width: ${UI_CONFIG.BREAKPOINTS.DESKTOP}px)`;
  }, []);
  
  return useMediaQuery(query);
};