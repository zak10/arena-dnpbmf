import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { UserRole, AuthErrorCode } from '../../types/auth';
import authReducer from '../../store/auth/authSlice';

// Mock crypto for CSRF token generation
const mockRandomUUID = jest.fn(() => 'test-csrf-token');
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: mockRandomUUID }
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

describe('useAuth Hook', () => {
  // Store setup for each test
  const createTestStore = () => configureStore({
    reducer: {
      auth: authReducer,
    },
  });

  // Wrapper component with Redux Provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={createTestStore()}>{children}</Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = '';
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBeFalsy();
    expect(result.current.loading).toBeFalsy();
    expect(result.current.error).toBeNull();
  });

  describe('Magic Link Authentication', () => {
    const validToken = 'valid-magic-link-token';
    const expiredToken = 'expired-token';
    const businessEmail = 'user@company.com';

    it('should handle successful magic link authentication', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithMagicLink(validToken);
      });

      expect(result.current.isAuthenticated).toBeTruthy();
      expect(result.current.user).toBeDefined();
      expect(document.cookie).toContain('XSRF-TOKEN');
      expect(result.current.error).toBeNull();
    });

    it('should handle expired magic link token', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.loginWithMagicLink(expiredToken);
        } catch (error) {
          expect(error.code).toBe(AuthErrorCode.INVALID_MAGIC_LINK);
        }
      });

      expect(result.current.isAuthenticated).toBeFalsy();
      expect(result.current.user).toBeNull();
    });

    it('should enforce rate limiting for magic link requests', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Attempt multiple requests within rate limit window
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          try {
            await result.current.loginWithMagicLink(validToken);
          } catch (error) {
            if (i >= 3) {
              expect(error.code).toBe('E4002'); // Rate limit error
            }
          }
        });
      }
    });
  });

  describe('Google OAuth Authentication', () => {
    const validGoogleToken = 'valid-google-token';
    const nonWorkspaceToken = 'personal-account-token';

    it('should handle successful Google workspace authentication', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithGoogle(validGoogleToken);
      });

      expect(result.current.isAuthenticated).toBeTruthy();
      expect(result.current.user).toBeDefined();
      expect(document.cookie).toContain('XSRF-TOKEN');
    });

    it('should reject non-workspace Google accounts', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.loginWithGoogle(nonWorkspaceToken);
        } catch (error) {
          expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
        }
      });

      expect(result.current.isAuthenticated).toBeFalsy();
      expect(result.current.user).toBeNull();
    });

    it('should handle token rotation', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithGoogle(validGoogleToken);
      });

      // Wait for token rotation interval
      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).not.toBe(validGoogleToken);
      }, { timeout: 3000 });
    });
  });

  describe('Session Management', () => {
    it('should handle session expiry', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login and set session
      await act(async () => {
        await result.current.loginWithGoogle('valid-token');
      });

      // Fast-forward past session timeout
      jest.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours

      expect(result.current.isAuthenticated).toBeFalsy();
      expect(result.current.user).toBeNull();
      expect(result.current.error?.code).toBe(AuthErrorCode.EXPIRED_SESSION);
    });

    it('should extend session with activity', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login and set session
      await act(async () => {
        await result.current.loginWithGoogle('valid-token');
      });

      // Simulate activity within sliding window
      jest.advanceTimersByTime(20 * 60 * 1000); // 20 minutes
      await act(async () => {
        await result.current.refreshSession();
      });

      expect(result.current.isAuthenticated).toBeTruthy();
      expect(localStorage.getItem('lastActivity')).toBeDefined();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should correctly identify buyer role', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithGoogle('valid-token');
        // Mock user with BUYER role
        result.current.user = {
          ...result.current.user,
          role: UserRole.BUYER
        };
      });

      expect(result.current.isBuyer()).toBeTruthy();
      expect(result.current.isArenaStaff()).toBeFalsy();
    });

    it('should correctly identify arena staff role', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithGoogle('valid-token');
        // Mock user with ARENA_STAFF role
        result.current.user = {
          ...result.current.user,
          role: UserRole.ARENA_STAFF
        };
      });

      expect(result.current.isArenaStaff()).toBeTruthy();
      expect(result.current.isBuyer()).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate network error
      await act(async () => {
        try {
          await result.current.loginWithMagicLink('network-error-token');
        } catch (error) {
          expect(error.code).toBe('E4003');
        }
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isAuthenticated).toBeFalsy();
    });

    it('should handle invalid credentials', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.loginWithGoogle('invalid-token');
        } catch (error) {
          expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
        }
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isAuthenticated).toBeFalsy();
    });

    it('should clear error state on successful login', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // First attempt fails
      await act(async () => {
        try {
          await result.current.loginWithGoogle('invalid-token');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      // Second attempt succeeds
      await act(async () => {
        await result.current.loginWithGoogle('valid-token');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBeTruthy();
    });
  });
});