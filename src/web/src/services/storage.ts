/**
 * @fileoverview Secure browser storage service with encryption, type safety, and cross-tab synchronization
 * for the Arena MVP frontend application.
 * 
 * Version: 1.0.0
 * 
 * Features:
 * - AES-256 encryption for sensitive data
 * - Type-safe storage operations
 * - Cross-tab synchronization
 * - Compression for large values
 * - Storage quota management
 * - Error handling
 */

import CryptoJS from 'crypto-js'; // v4.1.1
import { StorageKey } from '../utils/storage';

// Global constants
const ENCRYPTION_KEY = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY;
const STORAGE_PREFIX = 'arena_';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB storage limit
const COMPRESSION_THRESHOLD = 1024 * 50; // 50KB compression threshold

/**
 * Interface for storage event payload
 */
interface StorageEventPayload {
  key: string;
  value: string | null;
  timestamp: number;
  compressed?: boolean;
}

export class StorageService {
  private readonly encryptionKey: string;
  private readonly storagePrefix: string;
  private readonly storageEventHandlers: Map<string, Function>;

  constructor() {
    if (!ENCRYPTION_KEY) {
      throw new Error('Storage encryption key not configured');
    }

    // Initialize service
    this.encryptionKey = ENCRYPTION_KEY;
    this.storagePrefix = STORAGE_PREFIX;
    this.storageEventHandlers = new Map();

    // Verify storage availability
    if (!this.isStorageAvailable('localStorage') || !this.isStorageAvailable('sessionStorage')) {
      throw new Error('Browser storage is not available');
    }

    // Set up cross-tab synchronization
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    // Monitor storage quota
    this.monitorStorageQuota();
  }

  /**
   * Stores an encrypted item in browser storage
   * 
   * @param key - Storage key from StorageKey enum
   * @param value - Value to store
   * @param useSession - Whether to use sessionStorage
   * @throws Error if storage fails
   */
  public setSecureItem<T>(key: StorageKey, value: T, useSession: boolean = false): void {
    try {
      // Validate storage key
      if (!Object.values(StorageKey).includes(key)) {
        throw new Error('Invalid storage key');
      }

      // Check available space
      if (!this.hasStorageSpace()) {
        throw new Error('Storage quota exceeded');
      }

      // Serialize and validate value
      const serializedValue = JSON.stringify(value);
      if (!serializedValue) {
        throw new Error('Value serialization failed');
      }

      // Compress if needed
      let processedValue = serializedValue;
      let isCompressed = false;
      if (serializedValue.length > COMPRESSION_THRESHOLD) {
        processedValue = this.compressValue(serializedValue);
        isCompressed = true;
      }

      // Encrypt value
      const encryptedValue = CryptoJS.AES.encrypt(
        processedValue,
        this.encryptionKey
      ).toString();

      // Prepare storage payload
      const payload: StorageEventPayload = {
        key: `${this.storagePrefix}${key}`,
        value: encryptedValue,
        timestamp: Date.now(),
        compressed: isCompressed
      };

      // Store encrypted value
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem(payload.key, JSON.stringify(payload));

      // Trigger cross-tab sync
      if (!useSession) {
        this.dispatchStorageEvent(payload);
      }
    } catch (error) {
      throw new Error(`Storage operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves and decrypts an item from storage
   * 
   * @param key - Storage key from StorageKey enum
   * @param useSession - Whether to use sessionStorage
   * @returns Decrypted value or null if not found
   */
  public getSecureItem<T>(key: StorageKey, useSession: boolean = false): T | null {
    try {
      // Validate storage key
      if (!Object.values(StorageKey).includes(key)) {
        throw new Error('Invalid storage key');
      }

      // Get encrypted value
      const storage = useSession ? sessionStorage : localStorage;
      const storedItem = storage.getItem(`${this.storagePrefix}${key}`);
      
      if (!storedItem) {
        return null;
      }

      // Parse storage payload
      const payload: StorageEventPayload = JSON.parse(storedItem);
      if (!payload.value) {
        return null;
      }

      // Decrypt value
      const decryptedBytes = CryptoJS.AES.decrypt(payload.value, this.encryptionKey);
      const decryptedValue = decryptedBytes.toString(CryptoJS.enc.Utf8);

      // Decompress if needed
      const processedValue = payload.compressed 
        ? this.decompressValue(decryptedValue)
        : decryptedValue;

      // Parse and return typed value
      return JSON.parse(processedValue) as T;
    } catch (error) {
      console.error('Failed to retrieve storage item:', error);
      return null;
    }
  }

  /**
   * Removes an item from storage
   * 
   * @param key - Storage key from StorageKey enum
   * @param useSession - Whether to use sessionStorage
   */
  public removeSecureItem(key: StorageKey, useSession: boolean = false): void {
    try {
      // Validate storage key
      if (!Object.values(StorageKey).includes(key)) {
        throw new Error('Invalid storage key');
      }

      const storageKey = `${this.storagePrefix}${key}`;
      const storage = useSession ? sessionStorage : localStorage;
      
      // Remove item
      storage.removeItem(storageKey);

      // Trigger cross-tab sync
      if (!useSession) {
        this.dispatchStorageEvent({
          key: storageKey,
          value: null,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      throw new Error(`Failed to remove storage item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clears all storage items
   * 
   * @param useSession - Whether to clear sessionStorage
   */
  public clearStorage(useSession: boolean = false): void {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      
      // Clear items with prefix
      Object.keys(storage).forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          storage.removeItem(key);
        }
      });

      // Trigger cross-tab sync
      if (!useSession) {
        this.dispatchStorageEvent({
          key: this.storagePrefix,
          value: null,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handles storage events for cross-tab synchronization
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (!event.key?.startsWith(this.storagePrefix)) {
      return;
    }

    try {
      const payload: StorageEventPayload = event.newValue 
        ? JSON.parse(event.newValue)
        : { key: event.key, value: null, timestamp: Date.now() };

      // Execute registered handlers
      const handler = this.storageEventHandlers.get(event.key);
      if (handler) {
        handler(payload);
      }
    } catch (error) {
      console.error('Storage event handling failed:', error);
    }
  }

  /**
   * Checks if browser storage is available
   */
  private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Checks available storage space
   */
  private hasStorageSpace(): boolean {
    try {
      const testKey = '__quota_test__';
      const testValue = 'x'.repeat(MAX_STORAGE_SIZE);
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Monitors storage quota usage
   */
  private monitorStorageQuota(): void {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const usagePercent = (estimate.usage || 0) / (estimate.quota || 1) * 100;
        if (usagePercent > 90) {
          console.warn(`Storage usage at ${usagePercent.toFixed(1)}%`);
        }
      });
    }
  }

  /**
   * Compresses a string value
   */
  private compressValue(value: string): string {
    // Simple RLE compression for demo
    // In production, use a proper compression library
    return value.replace(/(.)\1+/g, (match, char) => `${match.length}${char}`);
  }

  /**
   * Decompresses a compressed string value
   */
  private decompressValue(value: string): string {
    // Simple RLE decompression for demo
    // In production, use a proper compression library
    return value.replace(/(\d+)(.)/g, (_, count, char) => char.repeat(Number(count)));
  }

  /**
   * Dispatches storage event for cross-tab sync
   */
  private dispatchStorageEvent(payload: StorageEventPayload): void {
    window.dispatchEvent(new StorageEvent('storage', {
      key: payload.key,
      newValue: JSON.stringify(payload)
    }));
  }
}

export default StorageService;