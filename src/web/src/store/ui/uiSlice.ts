/**
 * @fileoverview Redux slice for managing global UI state including theme, notifications,
 * loading states, modal visibility, and responsive sidebar behavior.
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { LoadingState } from '../../types/common';
import { UI_CONFIG } from '../../constants/common';

/**
 * Theme options supported by the application
 */
export type ThemeType = 'light' | 'dark' | 'system';

/**
 * Notification severity levels for different types of messages
 */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

/**
 * Structure for notification objects
 */
export interface Notification {
  id: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: number;
  duration?: number;
  autoHide?: boolean;
}

/**
 * Modal types supported by the application
 */
export type ModalType = 
  | 'REQUEST_CONFIRMATION'
  | 'PROPOSAL_PREVIEW'
  | 'ERROR_DETAILS'
  | 'SETTINGS'
  | null;

/**
 * Breakpoint types for responsive design
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * Interface defining the UI state structure
 */
interface UIState {
  theme: ThemeType;
  loadingState: LoadingState;
  notifications: Notification[];
  activeModal: ModalType;
  isSidebarOpen: boolean;
  retryCount: number;
  breakpoint: Breakpoint;
}

/**
 * Initial UI state with default values
 */
const initialState: UIState = {
  theme: 'system',
  loadingState: 'IDLE',
  notifications: [],
  activeModal: null,
  isSidebarOpen: false,
  retryCount: 0,
  breakpoint: 'desktop'
};

/**
 * Redux slice for UI state management
 */
export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Updates the theme preference and persists it to localStorage
     */
    setTheme: (state, action: PayloadAction<ThemeType>) => {
      try {
        localStorage.setItem('theme', action.payload);
        state.theme = action.payload;
        document.documentElement.setAttribute('data-theme', action.payload);
      } catch (error) {
        console.error('Failed to persist theme preference:', error);
      }
    },

    /**
     * Toggles between light and dark themes
     */
    toggleTheme: (state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('theme', newTheme);
        state.theme = newTheme;
        document.documentElement.setAttribute('data-theme', newTheme);
      } catch (error) {
        console.error('Failed to persist theme preference:', error);
      }
    },

    /**
     * Adds a new notification to the queue
     */
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...action.payload
      };
      state.notifications.push(notification);

      // Limit queue size to prevent memory issues
      if (state.notifications.length > 5) {
        state.notifications.shift();
      }
    },

    /**
     * Removes a notification from the queue by ID
     */
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },

    /**
     * Updates the loading state with retry support
     */
    setLoadingState: (state, action: PayloadAction<LoadingState>) => {
      state.loadingState = action.payload;
      if (action.payload === 'IDLE') {
        state.retryCount = 0;
      }
    },

    /**
     * Initiates a retry attempt for failed operations
     */
    setRetryingState: (state) => {
      state.loadingState = 'RETRYING';
      state.retryCount += 1;
    },

    /**
     * Shows a modal dialog
     */
    showModal: (state, action: PayloadAction<ModalType>) => {
      state.activeModal = action.payload;
    },

    /**
     * Hides the currently active modal
     */
    hideModal: (state) => {
      state.activeModal = null;
    },

    /**
     * Toggles the sidebar visibility state
     */
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },

    /**
     * Updates the current breakpoint based on window size
     */
    setBreakpoint: (state, action: PayloadAction<Breakpoint>) => {
      state.breakpoint = action.payload;
    }
  }
});

// Export actions for use in components
export const uiActions = uiSlice.actions;

// Export reducer as default
export default uiSlice.reducer;

/**
 * Selector to determine if the sidebar should be shown based on breakpoint
 */
export const selectShouldShowSidebar = (state: { ui: UIState }): boolean => {
  const { breakpoint, isSidebarOpen } = state.ui;
  return breakpoint === 'desktop' || breakpoint === 'wide' || isSidebarOpen;
};

/**
 * Selector to determine if the current loading state allows retry
 */
export const selectCanRetry = (state: { ui: UIState }): boolean => {
  return state.ui.loadingState === 'FAILED' && state.ui.retryCount < 3;
};

/**
 * Selector to get active notifications sorted by timestamp
 */
export const selectActiveNotifications = (state: { ui: UIState }): Notification[] => {
  return [...state.ui.notifications].sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Helper function to determine breakpoint from window width
 */
export const getBreakpointFromWidth = (width: number): Breakpoint => {
  if (width < UI_CONFIG.BREAKPOINTS.TABLET) return 'mobile';
  if (width < UI_CONFIG.BREAKPOINTS.DESKTOP) return 'tablet';
  if (width < UI_CONFIG.BREAKPOINTS.WIDE) return 'desktop';
  return 'wide';
};