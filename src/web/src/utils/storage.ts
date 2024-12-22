/**
 * @fileoverview Core utility module providing type-safe browser storage operations
 * with proper error handling for the Arena MVP frontend application.
 * 
 * Version: 1.0.0
 * 
 * Features:
 * - Type-safe storage operations
 * - Secure storage handling
 * - Session management
 * - Persistent user preferences
 * - Cross-tab synchronization
 * - Error handling
 * - Size validation
 */

// Global constants
const STORAGE_PREFIX = 'arena_' as const;
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB storage limit

/**
 * Enumeration of valid storage keys to ensure type safety
 * and prevent typos in storage operations
 */
export enum StorageKey {
  AUTH_TOKEN = 'auth_token',
  USER_PREFERENCES = 'user_preferences',
  THEME = 'theme',
  SESSION_EXPIRY = 'session_expiry'
}

/**
 * Custom error class for storage-related errors
 * with specific error types for different failure scenarios
 */
export class StorageError extends Error {
  static QuotaExceeded = 'Storage quota exceeded';
  static InvalidValue = 'Invalid storage value';
  static SerializationError = 'Serialization failed';
  static DeserializationError = 'Deserialization failed';

  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Type definition for operation results
 */
type Result<T, E = StorageError> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Stores an item in browser storage with type safety and error handling
 * 
 * @param key - Storage key from StorageKey enum
 * @param value - Value to store
 * @param useSession - Whether to use sessionStorage instead of localStorage
 * @returns Result indicating success or failure with error details
 */
export function setItem<T>(
  key: StorageKey,
  value: T,
  useSession: boolean = false
): Result<void> {
  try {
    // Validate key exists in enum
    if (!Object.values(StorageKey).includes(key)) {
      return {
        success: false,
        error: new StorageError('Invalid storage key')
      };
    }

    // Serialize value
    const serializedValue = JSON.stringify(value);
    if (!serializedValue) {
      return {
        success: false,
        error: new StorageError(StorageError.SerializationError)
      };
    }

    // Check size limit
    if (serializedValue.length > MAX_STORAGE_SIZE) {
      return {
        success: false,
        error: new StorageError(StorageError.QuotaExceeded)
      };
    }

    // Select storage type
    const storage = useSession ? sessionStorage : localStorage;
    const prefixedKey = `${STORAGE_PREFIX}${key}`;

    // Attempt to store value
    try {
      storage.setItem(prefixedKey, serializedValue);

      // Dispatch storage event for cross-tab sync if using localStorage
      if (!useSession) {
        window.dispatchEvent(new StorageEvent('storage', {
          key: prefixedKey,
          newValue: serializedValue
        }));
      }

      return { success: true, data: void 0 };
    } catch (e) {
      // Handle quota exceeded error
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        return {
          success: false,
          error: new StorageError(StorageError.QuotaExceeded)
        };
      }
      throw e;
    }
  } catch (e) {
    return {
      success: false,
      error: new StorageError(e instanceof Error ? e.message : 'Unknown error')
    };
  }
}

/**
 * Retrieves and deserializes an item from browser storage
 * 
 * @param key - Storage key from StorageKey enum
 * @param useSession - Whether to use sessionStorage instead of localStorage
 * @returns Result containing the retrieved value or error
 */
export function getItem<T>(
  key: StorageKey,
  useSession: boolean = false
): Result<T | null> {
  try {
    // Validate key exists in enum
    if (!Object.values(StorageKey).includes(key)) {
      return {
        success: false,
        error: new StorageError('Invalid storage key')
      };
    }

    // Select storage type
    const storage = useSession ? sessionStorage : localStorage;
    const prefixedKey = `${STORAGE_PREFIX}${key}`;

    // Get value from storage
    const serializedValue = storage.getItem(prefixedKey);
    if (serializedValue === null) {
      return { success: true, data: null };
    }

    // Attempt to deserialize
    try {
      const value = JSON.parse(serializedValue) as T;
      return { success: true, data: value };
    } catch (e) {
      return {
        success: false,
        error: new StorageError(StorageError.DeserializationError)
      };
    }
  } catch (e) {
    return {
      success: false,
      error: new StorageError(e instanceof Error ? e.message : 'Unknown error')
    };
  }
}

/**
 * Removes an item from browser storage
 * 
 * @param key - Storage key from StorageKey enum
 * @param useSession - Whether to use sessionStorage instead of localStorage
 * @returns Result indicating success or failure
 */
export function removeItem(
  key: StorageKey,
  useSession: boolean = false
): Result<void> {
  try {
    // Validate key exists in enum
    if (!Object.values(StorageKey).includes(key)) {
      return {
        success: false,
        error: new StorageError('Invalid storage key')
      };
    }

    // Select storage type
    const storage = useSession ? sessionStorage : localStorage;
    const prefixedKey = `${STORAGE_PREFIX}${key}`;

    // Remove item
    storage.removeItem(prefixedKey);

    // Dispatch storage event for cross-tab sync if using localStorage
    if (!useSession) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: prefixedKey,
        newValue: null
      }));
    }

    return { success: true, data: void 0 };
  } catch (e) {
    return {
      success: false,
      error: new StorageError(e instanceof Error ? e.message : 'Unknown error')
    };
  }
}