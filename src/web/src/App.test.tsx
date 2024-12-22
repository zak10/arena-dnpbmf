import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import App from './App';
import store from '../store';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock performance observer
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
class MockPerformanceObserver {
  constructor(callback: any) {
    callback({ getEntries: () => [] });
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
}
window.PerformanceObserver = MockPerformanceObserver as any;

// Mock performance metrics
const mockPerformanceEntries = [
  { name: 'first-contentful-paint', startTime: 1200 },
  { name: 'time-to-interactive', startTime: 2800 }
];
window.performance.getEntriesByType = jest.fn().mockReturnValue([
  { loadEventEnd: 2500 }
]);
window.performance.getEntriesByName = jest.fn().mockImplementation((name) => {
  return mockPerformanceEntries.filter(entry => entry.name === name);
});

// Mock Sentry for error tracking
jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn()
}));

describe('App', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset localStorage
    localStorage.clear();
    
    // Reset performance metrics
    mockPerformanceEntries.forEach(entry => {
      entry.startTime = entry.name === 'first-contentful-paint' ? 1200 : 2800;
    });
  });

  // Cleanup after each test
  afterEach(() => {
    // Cleanup any mounted components
    jest.clearAllMocks();
  });

  it('renders core application structure', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );

    // Verify error boundary is present
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

    // Verify performance monitoring is active
    expect(mockObserve).toHaveBeenCalledWith({
      entryTypes: ['navigation', 'paint', 'longtask']
    });

    // Verify Redux store provider is present
    expect(screen.getByTestId('redux-provider')).toBeInTheDocument();
  });

  it('handles theme preferences correctly', async () => {
    // Mock system theme preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn()
    }));

    render(
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );

    // Verify initial theme is applied
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    // Trigger theme change
    fireEvent.click(screen.getByTestId('theme-toggle'));

    // Verify theme was updated
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('manages application state correctly', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );

    // Dispatch test action
    store.dispatch({
      type: 'ui/addNotification',
      payload: {
        message: 'Test notification',
        severity: 'info',
        autoHide: true
      }
    });

    // Verify notification was added to state
    await waitFor(() => {
      expect(screen.getByText('Test notification')).toBeInTheDocument();
    });
  });

  it('handles routing correctly', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );

    // Navigate to requests page
    fireEvent.click(screen.getByTestId('nav-requests'));

    // Verify route change
    expect(window.location.pathname).toBe('/requests');
  });

  it('meets performance benchmarks', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );

    // Wait for performance metrics
    await waitFor(() => {
      const fcp = mockPerformanceEntries.find(e => e.name === 'first-contentful-paint');
      const tti = mockPerformanceEntries.find(e => e.name === 'time-to-interactive');

      // Verify metrics meet specifications
      expect(fcp?.startTime).toBeLessThan(1500); // 1.5s target
      expect(tti?.startTime).toBeLessThan(3500); // 3.5s target
    });
  });

  it('maintains accessibility standards', async () => {
    const { container } = render(
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA landmarks
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // Verify keyboard navigation
    const firstFocusable = screen.getByTestId('nav-home');
    firstFocusable.focus();
    expect(document.activeElement).toBe(firstFocusable);
  });

  it('handles errors gracefully', async () => {
    // Mock console.error to prevent test output noise
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Render app with error-triggering state
    render(
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );

    // Simulate error
    const error = new Error('Test error');
    window.dispatchEvent(new ErrorEvent('error', { error }));

    // Verify error boundary caught the error
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Test error/)).toBeInTheDocument();
    });

    // Verify error was reported to Sentry
    expect(Sentry.captureException).toHaveBeenCalledWith(error);

    // Cleanup
    consoleError.mockRestore();
  });
});