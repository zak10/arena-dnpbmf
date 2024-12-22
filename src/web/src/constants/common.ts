/**
 * @fileoverview Common constants and configuration values for the Arena web application.
 * Provides strictly typed and immutable configuration objects for system performance,
 * UI design, data management, and application states.
 * @version 1.0.0
 */

/**
 * Core application configuration including environment and performance settings
 */
export const APP_CONFIG = {
  NAME: 'Arena MVP' as const,
  VERSION: '1.0.0' as const,
  ENV: process.env.NODE_ENV || 'development' as const,
  PERFORMANCE: {
    /** API request timeout in milliseconds */
    API_TIMEOUT: 30000 as const,
    /** Number of retry attempts for failed requests */
    RETRY_ATTEMPTS: 3 as const,
    /** Delay between retry attempts in milliseconds */
    RETRY_DELAY: 1000 as const,
  },
} as const;

/**
 * UI configuration constants for responsive design, typography, spacing and theming
 */
export const UI_CONFIG = {
  BREAKPOINTS: {
    /** Mobile breakpoint (320px) */
    MOBILE: 320 as const,
    /** Tablet breakpoint (768px) */
    TABLET: 768 as const,
    /** Desktop breakpoint (1024px) */
    DESKTOP: 1024 as const,
    /** Wide desktop breakpoint (1440px) */
    WIDE: 1440 as const,
  },
  TYPOGRAPHY: {
    /** Base font size in pixels */
    BASE_SIZE: 16 as const,
    /** Typography scale factor for consistent sizing */
    SCALE_FACTOR: 1.25 as const,
    /** Primary font stack */
    FONT_FAMILY: 'Inter, system-ui, sans-serif' as const,
    /** Default line height */
    LINE_HEIGHT: 1.5 as const,
  },
  SPACING: {
    /** Base spacing unit in pixels */
    BASE: 8 as const,
    /** Grid spacing unit in pixels */
    GRID: 8 as const,
    /** Container padding in pixels */
    CONTAINER_PADDING: 16 as const,
  },
  COLORS: {
    /** Primary brand color (CSS custom property) */
    PRIMARY: 'var(--color-primary)' as const,
    /** Secondary brand color (CSS custom property) */
    SECONDARY: 'var(--color-secondary)' as const,
    /** Error state color (CSS custom property) */
    ERROR: 'var(--color-error)' as const,
  },
  ANIMATION: {
    /** Default animation duration in milliseconds */
    DURATION: 200 as const,
    /** Default animation easing function */
    EASING: 'ease-in-out' as const,
  },
} as const;

/**
 * Pagination configuration with validation limits
 */
export const PAGINATION = {
  /** Default number of items per page */
  DEFAULT_PAGE_SIZE: 10 as const,
  /** Maximum allowed items per page */
  MAX_PAGE_SIZE: 100 as const,
  /** Minimum allowed items per page */
  MIN_PAGE_SIZE: 5 as const,
} as const;

/**
 * Request status enumeration defining all possible states
 */
export enum REQUEST_STATUS {
  /** Initial draft state */
  DRAFT = 'DRAFT',
  /** Request submitted for processing */
  SUBMITTED = 'SUBMITTED',
  /** Request under review */
  IN_REVIEW = 'IN_REVIEW',
  /** Request processing completed */
  COMPLETED = 'COMPLETED',
  /** Request cancelled */
  CANCELLED = 'CANCELLED',
}

/**
 * Proposal status enumeration defining all possible states
 */
export enum PROPOSAL_STATUS {
  /** Awaiting review */
  PENDING = 'PENDING',
  /** Proposal accepted */
  ACCEPTED = 'ACCEPTED',
  /** Proposal rejected */
  REJECTED = 'REJECTED',
  /** Proposal withdrawn by vendor */
  WITHDRAWN = 'WITHDRAWN',
}

// Type exports for configuration objects
export type AppConfig = typeof APP_CONFIG;
export type UiConfig = typeof UI_CONFIG;
export type PaginationConfig = typeof PAGINATION;