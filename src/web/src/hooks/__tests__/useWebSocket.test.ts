/**
 * @fileoverview Test suite for useWebSocket custom hook
 * @version 1.0.0
 */

import { renderHook, act } from '@testing-library/react-hooks'; // v8.0.1
import { jest } from '@jest/globals'; // v29.0.0
import { useWebSocket } from '../useWebSocket';
import { WebSocketClient, WebSocketMessageType } from '../../api/websocket';
import { API_ENDPOINTS } from '../../constants/api';
import { ERROR_CODES, ERROR_SEVERITIES } from '../../utils/error';

// Mock WebSocket client
jest.mock('../../api/websocket');

// Mock constants
const MOCK_AUTH_TOKEN = 'test-auth-token';
const MOCK_REQUEST_ID = 'test-request-id';
const MOCK_PROPOSAL_ID = 'test-proposal-id';

// Mock WebSocket client implementation
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockSend = jest.fn();
const mockOn = jest.fn();

// Mock error response
const mockError = {
  code: ERROR_CODES.NETWORK_ERROR,
  message: 'WebSocket connection failed',
  severity: ERROR_SEVERITIES.ERROR,
  details: {}
};

describe('useWebSocket Hook', () => {
  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset WebSocket client mock
    (WebSocketClient as jest.Mock).mockImplementation(() => ({
      connect: mockConnect,
      disconnect: mockDisconnect,
      send: mockSend,
      on: mockOn
    }));

    // Reset connection state
    mockConnect.mockResolvedValue(undefined);
  });

  // Cleanup after each test
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Connection Management', () => {
    it('should establish initial connection on mount', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN, { debug: true })
      );

      expect(result.current.connectionState).toBe(0); // CONNECTING
      expect(WebSocketClient).toHaveBeenCalledWith(
        `${API_ENDPOINTS.REQUESTS.BASE}/ws`,
        MOCK_AUTH_TOKEN,
        expect.any(Object)
      );

      await waitForNextUpdate();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should handle successful connection', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN)
      );

      // Simulate successful connection
      act(() => {
        const onConnectedCallback = mockOn.mock.calls.find(
          call => call[0] === 'connected'
        )[1];
        onConnectedCallback();
      });

      await waitForNextUpdate();
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe(1); // CONNECTED
      expect(result.current.error).toBeNull();
    });

    it('should handle connection failures with retry', async () => {
      mockConnect.mockRejectedValueOnce(mockError);

      const { result, waitForNextUpdate } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN, { autoReconnect: true })
      );

      await waitForNextUpdate();
      expect(result.current.connectionState).toBe(3); // ERROR
      expect(result.current.error).toEqual(mockError);

      // Verify retry attempt
      act(() => {
        jest.advanceTimersByTime(1000); // First retry delay
      });

      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Subscription Management', () => {
    it('should handle request subscription', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN)
      );

      // Simulate connected state
      act(() => {
        mockOn.mock.calls.find(call => call[0] === 'connected')[1]();
      });

      await waitForNextUpdate();

      // Subscribe to request updates
      act(() => {
        result.current.subscribeToRequest(MOCK_REQUEST_ID, {
          onMessage: jest.fn(),
          queueOfflineMessages: true
        });
      });

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        type: WebSocketMessageType.REQUEST_UPDATE,
        payload: { requestId: MOCK_REQUEST_ID }
      }));
    });

    it('should handle proposal subscription', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN)
      );

      // Simulate connected state
      act(() => {
        mockOn.mock.calls.find(call => call[0] === 'connected')[1]();
      });

      await waitForNextUpdate();

      // Subscribe to proposal updates
      act(() => {
        result.current.subscribeToProposal(MOCK_PROPOSAL_ID, {
          onMessage: jest.fn(),
          queueOfflineMessages: true
        });
      });

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        type: WebSocketMessageType.PROPOSAL_UPDATE,
        payload: { proposalId: MOCK_PROPOSAL_ID }
      }));
    });

    it('should queue messages when offline', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN)
      );

      // Subscribe while disconnected
      act(() => {
        result.current.subscribeToRequest(MOCK_REQUEST_ID, {
          queueOfflineMessages: true
        });
      });

      await waitForNextUpdate();
      expect(mockSend).not.toHaveBeenCalled();
      expect(result.current.queueSize).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const errorEvent = new Event('error');
      mockConnect.mockRejectedValueOnce(mockError);

      const { result, waitForNextUpdate } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN)
      );

      await waitForNextUpdate();
      expect(result.current.error).toEqual(mockError);
      expect(result.current.connectionState).toBe(3); // ERROR
    });

    it('should handle max retries exceeded', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN, { maxRetries: 1 })
      );

      // Simulate max retries exceeded
      act(() => {
        mockOn.mock.calls.find(call => call[0] === 'max_retries_exceeded')[1]();
      });

      await waitForNextUpdate();
      expect(result.current.error).toEqual(expect.objectContaining({
        code: ERROR_CODES.NETWORK_ERROR
      }));
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on unmount', () => {
      const { unmount } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN)
      );

      unmount();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should clear subscriptions on unmount', async () => {
      const { result, unmount, waitForNextUpdate } = renderHook(() => 
        useWebSocket(MOCK_AUTH_TOKEN)
      );

      // Add some subscriptions
      act(() => {
        result.current.subscribeToRequest(MOCK_REQUEST_ID);
        result.current.subscribeToProposal(MOCK_PROPOSAL_ID);
      });

      await waitForNextUpdate();
      unmount();

      // Verify cleanup
      expect(mockDisconnect).toHaveBeenCalled();
      expect(result.current.queueSize).toBe(0);
    });
  });
});