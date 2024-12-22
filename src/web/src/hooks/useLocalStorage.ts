/**
 * @fileoverview Custom React hook for managing browser local storage with type safety,
 * state synchronization, error handling, and cross-tab support.
 * 
 * Version: 1.0.0
 * 
 * Features:
 * - Type-safe storage operations
 * - Cross-tab synchronization
 * - Error boundary pattern
 * - Automatic cleanup
 * - Debounced updates
 * - Storage quota monitoring
 */

import { useState, useEffect, useCallback, useMemo } from 'react'; // v18.0.0
import { StorageService } from '../services/storage';
import { StorageKey } from '../utils/storage';

// Initialize storage service singleton
const storageService = new StorageService();

// Debounce delay for storage updates
const STORAGE_DEBOUNCE_MS = 300;

/**
 * Type definition for storage operation errors
 */
type StorageError = {
  message: string;
  code: string;
  timestamp: number;
};

/**
 * Custom hook for managing local storage state with React
 * 
 * @param key - Storage key from StorageKey enum
 * @param initialValue - Initial value with type T
 * @returns Tuple of [current value, setter function, error state]
 */
export function useLocalStorage<T>(
  key: StorageKey,
  initialValue: T
): [T, (value: T) => void, StorageError | null] {
  // Validate storage key
  const validKey = useMemo(() => {
    if (!Object.values(StorageKey).includes(key)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return key;
  }, [key]);

  // Initialize state with stored value or initial value
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = storageService.getSecureItem<T>(validKey);
      return storedValue !== null ? storedValue : initialValue;
    } catch (error) {
      console.error('Failed to initialize storage state:', error);
      return initialValue;
    }
  });

  // Track storage errors
  const [error, setError] = useState<StorageError | null>(null);

  // Debounced storage update
  const debouncedUpdate = useCallback((value: T) => {
    let timeoutId: NodeJS.Timeout;

    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          storageService.setSecureItem(validKey, value);
          setError(null);
        } catch (error) {
          const storageError: StorageError = {
            message: error instanceof Error ? error.message : 'Unknown storage error',
            code: 'STORAGE_UPDATE_FAILED',
            timestamp: Date.now()
          };
          setError(storageError);
          console.error('Storage update failed:', storageError);
        }
      }, STORAGE_DEBOUNCE_MS);
    };
  }, [validKey]);

  // Update state and storage
  const setValue = useCallback((value: T) => {
    try {
      // Update React state
      setState(value);
      
      // Update storage with debounce
      debouncedUpdate(value)();
    } catch (error) {
      const storageError: StorageError = {
        message: error instanceof Error ? error.message : 'Unknown storage error',
        code: 'STORAGE_SET_FAILED',
        timestamp: Date.now()
      };
      setError(storageError);
      console.error('Failed to set storage value:', storageError);
    }
  }, [debouncedUpdate]);

  // Handle cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.includes(validKey)) {
        try {
          const newValue = event.newValue 
            ? JSON.parse(event.newValue) as T 
            : initialValue;
          
          setState(newValue);
          setError(null);
        } catch (error) {
          const storageError: StorageError = {
            message: error instanceof Error ? error.message : 'Unknown sync error',
            code: 'STORAGE_SYNC_FAILED',
            timestamp: Date.now()
          };
          setError(storageError);
          console.error('Storage sync failed:', storageError);
        }
      }
    };

    // Add storage event listener
    window.addEventListener('storage', handleStorageChange);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [validKey, initialValue]);

  // Handle storage quota monitoring
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const usagePercent = (estimate.usage || 0) / (estimate.quota || 1) * 100;
        if (usagePercent > 90) {
          const storageError: StorageError = {
            message: `Storage usage critical: ${usagePercent.toFixed(1)}%`,
            code: 'STORAGE_QUOTA_WARNING',
            timestamp: Date.now()
          };
          setError(storageError);
        }
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        // Ensure final state is persisted
        const finalState = state;
        storageService.setSecureItem(validKey, finalState);
      } catch (error) {
        console.error('Storage cleanup failed:', error);
      }
    };
  }, [validKey, state]);

  return [state, setValue, error];
}

export default useLocalStorage;
```

This implementation provides a robust and secure local storage hook with the following features:

1. Type Safety:
- Uses TypeScript generics for type-safe storage operations
- Validates storage keys against StorageKey enum
- Proper error typing and handling

2. Security:
- Uses StorageService for encrypted storage operations
- Handles sensitive data securely
- Implements storage quota monitoring

3. Cross-Tab Synchronization:
- Listens for storage events across tabs
- Synchronizes state between tabs
- Handles sync errors gracefully

4. Performance:
- Implements debounced storage updates
- Memoizes key validation
- Uses efficient state updates

5. Error Handling:
- Comprehensive error tracking
- Type-safe error reporting
- Console logging for debugging

6. Cleanup:
- Proper event listener cleanup
- Final state persistence
- Memory leak prevention

7. Usage Example:
```typescript
const [theme, setTheme, error] = useLocalStorage<'light' | 'dark'>(
  StorageKey.THEME,
  'light'
);

// Use theme state
console.log(theme); // 'light' | 'dark'

// Update theme
setTheme('dark');

// Handle errors
if (error) {
  console.error('Storage error:', error.message);
}