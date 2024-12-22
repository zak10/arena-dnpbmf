/**
 * @fileoverview Root Redux store configuration with enhanced TypeScript support
 * @version 1.0.0
 * 
 * Implements centralized state management with Redux Toolkit, including:
 * - Type-safe store configuration
 * - Performance-optimized middleware setup
 * - Comprehensive error handling
 * - Development tools integration
 */

import { configureStore } from '@reduxjs/toolkit'; // v1.9.0
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'; // v8.1.0

// Import feature reducers
import authReducer from './auth/authSlice';
import proposalsReducer from './proposals/proposalsSlice';
import requestsReducer from './requests/requestsSlice';
import uiReducer from './ui/uiSlice';

/**
 * Redux DevTools configuration based on technical specifications
 * Implements performance monitoring with trace and action limits
 */
const REDUX_DEVTOOLS_CONFIG = {
  name: 'Arena MVP Store',
  maxAge: 50, // Limit stored actions for performance
  trace: process.env.NODE_ENV !== 'production', // Enable action tracing in development
  traceLimit: 25, // Limit stack trace length
} as const;

/**
 * Middleware configuration based on technical specifications
 * Optimizes for production performance while maintaining development capabilities
 */
const MIDDLEWARE_CONFIG = {
  // Enable thunk middleware for async actions
  thunk: true,
  // Enable serializable check in development only
  serializableCheck: process.env.NODE_ENV !== 'production',
  // Enable immutability check in development only
  immutableCheck: process.env.NODE_ENV !== 'production',
} as const;

/**
 * Configure and create the Redux store with all reducers and middleware
 * Implements performance optimization based on technical specifications
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    proposals: proposalsReducer,
    requests: requestsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: MIDDLEWARE_CONFIG.thunk,
      serializableCheck: MIDDLEWARE_CONFIG.serializableCheck,
      immutableCheck: MIDDLEWARE_CONFIG.immutableCheck,
    }),
  devTools: process.env.NODE_ENV !== 'production'
    ? REDUX_DEVTOOLS_CONFIG
    : false,
});

/**
 * Type definitions for Redux store
 * Enables type-safe state access and action dispatching
 */

// Root state type derived from store
export type RootState = ReturnType<typeof store.getState>;

// Typed dispatch derived from store
export type AppDispatch = typeof store.dispatch;

/**
 * Type-safe hooks for accessing Redux store
 * Provides enhanced TypeScript support for components
 */

// Type-safe dispatch hook
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Type-safe selector hook
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Export store as default
export default store;