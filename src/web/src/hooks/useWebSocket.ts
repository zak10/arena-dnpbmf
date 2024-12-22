/**
 * @fileoverview Custom React hook for managing WebSocket connections in Arena MVP
 * @version 1.0.0
 * 
 * Implements real-time updates with connection lifecycle management, message queueing,
 * and graceful degradation for the Arena platform.
 */

import { useState, useEffect, useCallback, useRef } from 'react'; // v18.0.0
import { WebSocketClient, WebSocketMessage, WebSocketMessageType } from '../api/websocket';
import { API_ENDPOINTS } from '../constants/api';
import { ErrorResponse } from '../types/common';

// Connection states based on WebSocket lifecycle
export enum SOCKET_STATES {
  CONNECTING = 0,
  CONNECTED = 1,
  DISCONNECTED = 2,
  ERROR = 3
}

// Exponential backoff delays for reconnection attempts (in ms)
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

// Maximum size of offline message queue
const MAX_QUEUE_SIZE = 1000;

// WebSocket hook configuration interface
interface WebSocketConfig {
  debug?: boolean;
  autoReconnect?: boolean;
  maxRetries?: number;
  pingInterval?: number;
}

// Subscription options interface
interface SubscriptionOptions {
  onMessage?: (data: unknown) => void;
  onError?: (error: ErrorResponse) => void;
  queueOfflineMessages?: boolean;
}

/**
 * Custom hook for managing WebSocket connections with enhanced reliability
 */
export function useWebSocket(authToken: string, config: WebSocketConfig = {}) {
  const [connectionState, setConnectionState] = useState<SOCKET_STATES>(SOCKET_STATES.DISCONNECTED);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [queueSize, setQueueSize] = useState(0);

  // Refs for mutable values that shouldn't trigger re-renders
  const clientRef = useRef<WebSocketClient | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const subscriptionsRef = useRef<Map<string, SubscriptionOptions>>(new Map());

  /**
   * Initializes WebSocket client with configuration
   */
  const initializeClient = useCallback(() => {
    if (clientRef.current) {
      return;
    }

    const wsClient = new WebSocketClient(
      `${API_ENDPOINTS.REQUESTS.BASE}/ws`,
      authToken,
      {
        debug: config.debug,
        maxRetries: config.maxRetries,
        pingInterval: config.pingInterval
      }
    );

    // Set up event listeners
    wsClient.on('connected', () => {
      setConnectionState(SOCKET_STATES.CONNECTED);
      setError(null);
      setRetryCount(0);
      processMessageQueue();
    });

    wsClient.on('disconnected', () => {
      setConnectionState(SOCKET_STATES.DISCONNECTED);
    });

    wsClient.on('error', (wsError: ErrorResponse) => {
      setError(wsError);
      setConnectionState(SOCKET_STATES.ERROR);
    });

    wsClient.on('max_retries_exceeded', () => {
      setError({
        code: 'E4003',
        message: 'WebSocket connection failed after maximum retry attempts',
        severity: 'ERROR',
        details: { retryCount }
      });
    });

    clientRef.current = wsClient;
  }, [authToken, config.debug, config.maxRetries, config.pingInterval, retryCount]);

  /**
   * Processes queued messages after reconnection
   */
  const processMessageQueue = useCallback(() => {
    if (!clientRef.current || connectionState !== SOCKET_STATES.CONNECTED) {
      return;
    }

    while (messageQueueRef.current.length > 0) {
      const message = messageQueueRef.current.shift();
      if (message) {
        clientRef.current.send(message);
      }
    }
    setQueueSize(messageQueueRef.current.length);
  }, [connectionState]);

  /**
   * Subscribes to real-time updates for a specific request
   */
  const subscribeToRequest = useCallback((
    requestId: string,
    options: SubscriptionOptions = {}
  ) => {
    if (!clientRef.current) {
      throw new Error('WebSocket client not initialized');
    }

    const subscriptionId = `request_${requestId}`;
    subscriptionsRef.current.set(subscriptionId, options);

    const message: WebSocketMessage = {
      type: WebSocketMessageType.REQUEST_UPDATE,
      payload: { requestId },
      timestamp: new Date().toISOString(),
      requestId
    };

    if (connectionState === SOCKET_STATES.CONNECTED) {
      clientRef.current.send(message);
    } else if (options.queueOfflineMessages) {
      if (messageQueueRef.current.length < MAX_QUEUE_SIZE) {
        messageQueueRef.current.push(message);
        setQueueSize(messageQueueRef.current.length);
      } else {
        console.warn('Message queue full, dropping message');
      }
    }

    return {
      unsubscribe: () => {
        subscriptionsRef.current.delete(subscriptionId);
      }
    };
  }, [connectionState]);

  /**
   * Subscribes to real-time updates for a specific proposal
   */
  const subscribeToProposal = useCallback((
    proposalId: string,
    options: SubscriptionOptions = {}
  ) => {
    if (!clientRef.current) {
      throw new Error('WebSocket client not initialized');
    }

    const subscriptionId = `proposal_${proposalId}`;
    subscriptionsRef.current.set(subscriptionId, options);

    const message: WebSocketMessage = {
      type: WebSocketMessageType.PROPOSAL_UPDATE,
      payload: { proposalId },
      timestamp: new Date().toISOString(),
      requestId: proposalId
    };

    if (connectionState === SOCKET_STATES.CONNECTED) {
      clientRef.current.send(message);
    } else if (options.queueOfflineMessages) {
      if (messageQueueRef.current.length < MAX_QUEUE_SIZE) {
        messageQueueRef.current.push(message);
        setQueueSize(messageQueueRef.current.length);
      } else {
        console.warn('Message queue full, dropping message');
      }
    }

    return {
      unsubscribe: () => {
        subscriptionsRef.current.delete(subscriptionId);
      }
    };
  }, [connectionState]);

  /**
   * Handles connection lifecycle
   */
  useEffect(() => {
    initializeClient();

    // Attempt initial connection
    if (clientRef.current) {
      setConnectionState(SOCKET_STATES.CONNECTING);
      clientRef.current.connect().catch((err) => {
        setError(err);
        setConnectionState(SOCKET_STATES.ERROR);
      });
    }

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      subscriptionsRef.current.clear();
      messageQueueRef.current = [];
      setQueueSize(0);
    };
  }, [initializeClient]);

  /**
   * Handles automatic reconnection
   */
  useEffect(() => {
    if (!config.autoReconnect || connectionState !== SOCKET_STATES.ERROR) {
      return;
    }

    const retryDelay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
    const timeoutId = setTimeout(() => {
      if (clientRef.current) {
        setConnectionState(SOCKET_STATES.CONNECTING);
        setRetryCount((prev) => prev + 1);
        clientRef.current.connect().catch((err) => {
          setError(err);
          setConnectionState(SOCKET_STATES.ERROR);
        });
      }
    }, retryDelay);

    return () => clearTimeout(timeoutId);
  }, [connectionState, config.autoReconnect, retryCount]);

  return {
    isConnected: connectionState === SOCKET_STATES.CONNECTED,
    error,
    subscribeToRequest,
    subscribeToProposal,
    connectionState,
    retryCount,
    queueSize
  };
}

export type { SubscriptionOptions, WebSocketConfig };
```

This implementation provides a robust WebSocket hook that:

1. Manages WebSocket connection lifecycle with proper cleanup
2. Implements exponential backoff for reconnection attempts
3. Provides message queueing for offline scenarios
4. Handles subscriptions to request and proposal updates
5. Includes comprehensive error handling and monitoring
6. Supports configuration options for debugging and retry behavior
7. Uses TypeScript for type safety and better developer experience
8. Follows React best practices for hooks and state management
9. Integrates with the existing WebSocket client implementation
10. Provides status monitoring through connection state and queue size

The hook can be used in components like:

```typescript
const { 
  isConnected, 
  error, 
  subscribeToRequest 
} = useWebSocket(authToken, {
  debug: true,
  autoReconnect: true
});

useEffect(() => {
  const subscription = subscribeToRequest(requestId, {
    onMessage: (data) => console.log('Update received:', data),
    queueOfflineMessages: true
  });
  
  return () => subscription.unsubscribe();
}, [requestId]);