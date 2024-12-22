// @testing-library/jest-dom v5.16.5
import '@testing-library/jest-dom';
// jest-fetch-mock v3.0.0
import { enableFetchMocks } from 'jest-fetch-mock';
// resize-observer-polyfill v1.5.1
import ResizeObserverPolyfill from 'resize-observer-polyfill';

/**
 * Extends Jest with custom DOM element matchers and type definitions
 */
const setupJestDom = (): void => {
  // Extend Jest expect with DOM matchers
  expect.extend({
    toHaveErrorMessage(received: HTMLElement, expectedMessage: string) {
      const hasError = received.getAttribute('aria-errormessage') === expectedMessage;
      return {
        message: () =>
          `expected element to have error message "${expectedMessage}"`,
        pass: hasError,
      };
    },
  });
};

/**
 * Configures fetch mock with comprehensive error handling and response templates
 */
const setupFetchMock = (): void => {
  // Enable fetch mocking globally
  enableFetchMocks();

  // Configure default mock behavior
  fetchMock.mockResponse(async (req) => {
    // Default success response template
    return JSON.stringify({ success: true });
  });

  // Configure common response templates
  const mockResponses = {
    success: { status: 200, body: JSON.stringify({ success: true }) },
    unauthorized: { status: 401, body: JSON.stringify({ error: 'Unauthorized' }) },
    notFound: { status: 404, body: JSON.stringify({ error: 'Not found' }) },
    serverError: { status: 500, body: JSON.stringify({ error: 'Server error' }) },
  };

  // Make response templates available globally
  (global as any).mockResponses = mockResponses;
};

/**
 * Sets up comprehensive browser API mocks with error handling
 */
const setupGlobalMocks = (): void => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock ResizeObserver
  (global as any).ResizeObserver = ResizeObserverPolyfill;

  // Mock IntersectionObserver
  (global as any).IntersectionObserver = class IntersectionObserver {
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
        takeRecords: jest.fn().mockReturnValue([]),
      };
    }
  };

  // Mock MutationObserver
  (global as any).MutationObserver = class MutationObserver {
    constructor(callback: MutationCallback) {
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
        takeRecords: jest.fn().mockReturnValue([]),
      };
    }
  };

  // Mock requestAnimationFrame
  (global as any).requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return setTimeout(() => callback(Date.now()), 0);
  };

  // Mock cancelAnimationFrame
  (global as any).cancelAnimationFrame = (handle: number): void => {
    clearTimeout(handle);
  };
};

// Initialize all test environment configurations
setupJestDom();
setupFetchMock();
setupGlobalMocks();

// Configure global error handling for tests
const originalConsoleError = console.error;
console.error = (...args: any[]): void => {
  // Fail tests on console errors
  if (args[0] instanceof Error) {
    throw args[0];
  }
  originalConsoleError(...args);
};

// Configure Jest environment options
beforeAll(() => {
  // Suppress console warnings during tests
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
  jest.clearAllTimers();
  fetchMock.resetMocks();
});

// Type augmentation for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveErrorMessage(message: string): R;
    }
  }
}

// Export types for test files
export type MockResponses = {
  success: { status: 200, body: string };
  unauthorized: { status: 401, body: string };
  notFound: { status: 404, body: string };
  serverError: { status: 500, body: string };
};