/**
 * @fileoverview Enhanced WebSocket client implementation for Arena MVP frontend
 * @version 1.0.0
 * 
 * Implements robust WebSocket connection management with heartbeat mechanism,
 * exponential backoff, and comprehensive error handling.
 */

import EventEmitter from 'events'; // v3.3.0
import { API_ENDPOINTS } from '../constants/api';
import { parseApiError } from '../utils/error';
import { ErrorResponse, ErrorCode } from '../types/common';

// Connection configuration constants
const WS_RECONNECT_INTERVAL = 5000;
const WS_MAX_RETRIES = 3;
const WS_PING_INTERVAL = 30000;
const WS_BACKOFF_MULTIPLIER = 1.5;
const WS_MAX_BACKOFF = 30000;

/**
 * WebSocket message types for type-safe message handling
 */
export enum WebSocketMessageType {
  REQUEST_UPDATE = 'REQUEST_UPDATE',
  PROPOSAL_UPDATE = 'PROPOSAL_UPDATE',
  PING = 'PING',
  PONG = 'PONG',
  ERROR = 'ERROR'
}

/**
 * WebSocket connection options interface
 */
export interface WebSocketOptions {
  reconnectInterval?: number;
  maxRetries?: number;
  pingInterval?: number;
  debug?: boolean;
}

/**
 * WebSocket message interface for type safety
 */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: string;
  requestId?: string;
}

/**
 * Enhanced WebSocket client with robust connection management
 */
export class WebSocketClient extends EventEmitter {
  private socket: WebSocket | null = null;
  private retryCount = 0;
  private isConnected = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private readonly options: Required<WebSocketOptions>;
  private readonly messageQueue: WebSocketMessage[] = [];

  constructor(
    private readonly url: string,
    private readonly authToken: string,
    options: WebSocketOptions = {}
  ) {
    super();
    this.options = {
      reconnectInterval: WS_RECONNECT_INTERVAL,
      maxRetries: WS_MAX_RETRIES,
      pingInterval: WS_PING_INTERVAL,
      debug: false,
      ...options
    };
  }

  /**
   * Establishes WebSocket connection with enhanced reliability
   */
  public async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);
        
        // Add authentication header
        this.socket.onopen = () => {
          this.socket?.send(JSON.stringify({ 
            type: 'AUTH',
            payload: { token: this.authToken }
          }));
        };

        this.socket.onmessage = this.handleMessage.bind(this);
        this.socket.onerror = this.handleError.bind(this);
        this.socket.onclose = this.handleClose.bind(this);

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
          this.socket?.close();
        }, 10000);

        // Handle successful connection
        this.once('connected', () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.retryCount = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        });

      } catch (error) {
        reject(error);
        this.handleError(error);
      }
    });
  }

  /**
   * Cleanly disconnects WebSocket connection
   */
  public disconnect(): void {
    this.isConnected = false;
    this.stopHeartbeat();
    this.clearReconnectTimeout();
    
    if (this.socket) {
      this.socket.onclose = null; // Prevent reconnection attempt
      this.socket.close();
      this.socket = null;
    }

    this.emit('disconnected');
  }

  /**
   * Sends message with queue support for offline handling
   */
  public send(message: WebSocketMessage): void {
    if (!this.isConnected) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.socket?.send(JSON.stringify(message));
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Processes queued messages after reconnection
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Handles incoming WebSocket messages with type safety
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case WebSocketMessageType.PONG:
          this.lastPingTime = Date.now();
          break;

        case WebSocketMessageType.ERROR:
          this.emit('error', parseApiError(message.payload));
          break;

        case WebSocketMessageType.REQUEST_UPDATE:
        case WebSocketMessageType.PROPOSAL_UPDATE:
          this.emit(message.type.toLowerCase(), message.payload);
          break;

        default:
          this.options.debug && console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handles WebSocket errors with enhanced error parsing
   */
  private handleError(error: unknown): void {
    const parsedError = parseApiError(error);
    this.emit('error', parsedError);

    if (this.options.debug) {
      console.error('WebSocket error:', parsedError);
    }
  }

  /**
   * Handles connection close with reconnection logic
   */
  private handleClose(): void {
    this.isConnected = false;
    this.stopHeartbeat();

    if (this.retryCount < this.options.maxRetries) {
      const backoffTime = Math.min(
        this.options.reconnectInterval * Math.pow(WS_BACKOFF_MULTIPLIER, this.retryCount),
        WS_MAX_BACKOFF
      );

      this.reconnectTimeout = setTimeout(() => {
        this.retryCount++;
        this.connect().catch(this.handleError.bind(this));
      }, backoffTime);
    } else {
      this.emit('max_retries_exceeded');
    }
  }

  /**
   * Implements heartbeat mechanism for connection monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastPingTime = Date.now();

    this.pingInterval = setInterval(() => {
      if (Date.now() - this.lastPingTime > this.options.pingInterval * 2) {
        this.socket?.close();
        return;
      }

      this.send({
        type: WebSocketMessageType.PING,
        payload: null,
        timestamp: new Date().toISOString()
      });
    }, this.options.pingInterval);
  }

  /**
   * Cleans up heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Cleans up reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

/**
 * Factory function to create WebSocket client instances
 */
export function createWebSocketClient(
  url: string,
  authToken: string,
  options?: WebSocketOptions
): WebSocketClient {
  return new WebSocketClient(url, authToken, options);
}

// Export WebSocket message type for external use
export type { WebSocketMessage };