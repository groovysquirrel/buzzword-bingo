import { API } from 'aws-amplify';

/**
 * WebSocket connection options
 */
export interface WebSocketOptions {
  url: string;
  token: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Simple Event Emitter for WebSocket events
 */
class SimpleEventEmitter {
  private listeners: { [eventName: string]: Function[] } = {};

  on(eventName: string, listener: Function): () => void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listener);

    // Return an unsubscribe function
    return () => {
      this.listeners[eventName] = this.listeners[eventName].filter(l => l !== listener);
      if (this.listeners[eventName].length === 0) {
        delete this.listeners[eventName];
      }
    };
  }

  emit(eventName: string, ...args: any[]): void {
    if (this.listeners[eventName]) {
      const currentListeners = [...this.listeners[eventName]];
      currentListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in listener for event "${eventName}":`, error);
        }
      });
    }
  }

  removeAllListeners(eventName?: string): void {
    if (eventName) {
      delete this.listeners[eventName];
    } else {
      this.listeners = {};
    }
  }
}

/**
 * WebSocket Service for managing connections with proper error handling and reconnection
 */
export class WebSocketService extends SimpleEventEmitter {
  private ws: WebSocket | null = null;
  private options: WebSocketOptions;
  private connectionState = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(options: WebSocketOptions) {
    super();
    this.options = {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      ...options
    };
  }

  public async connect(): Promise<void> {
    if (this.connectionState || this.isConnecting) {
      console.warn('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    this.emit('statusUpdate', 'Connecting...');

    try {
      console.log('Creating WebSocket connection to:', this.getBaseUrl());
      
      const url = `${this.options.url}?token=${encodeURIComponent(this.options.token)}`;
      this.ws = new WebSocket(url);

      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      // Wait for connection to open or fail
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000); // 10 second timeout

        const cleanup = () => {
          clearTimeout(timeout);
        };

        this.ws!.onopen = (event) => {
          cleanup();
          this.handleOpen(event);
          resolve();
        };

        this.ws!.onerror = (event) => {
          cleanup();
          this.handleError(event);
          reject(new Error('WebSocket connection failed'));
        };
      });

    } catch (error) {
      this.isConnecting = false;
      this.connectionState = false;
      console.error('WebSocket connection failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private getBaseUrl(): string {
    return this.options.url.replace(/\?.*$/, ''); // Remove query parameters for logging
  }

  private handleOpen(event: Event): void {
    console.log('WebSocket connected successfully');
    this.connectionState = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.emit('connectionChange', true);
    this.emit('statusUpdate', 'Connected');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      this.emit('message', data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emit('error', new Error('Failed to parse message'));
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    this.connectionState = false;
    this.isConnecting = false;
    this.ws = null;

    this.emit('connectionChange', false);

    // Handle different close codes and decide if we should reconnect
    if (this.shouldReconnect(event.code)) {
      this.scheduleReconnect();
    } else {
      this.emit('statusUpdate', `Disconnected (${event.code}): ${event.reason || 'Unknown reason'}`);
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.emit('error', new Error('WebSocket connection error'));
  }

  private shouldReconnect(code: number): boolean {
    // Don't reconnect on normal closure or authentication failures
    if (code === 1000 || code === 1002 || code === 1003 || code === 4001) {
      return false;
    }
    
    // Don't exceed max reconnect attempts
    return this.reconnectAttempts < (this.options.maxReconnectAttempts || 5);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    const delay = Math.min(
      this.options.reconnectDelay! * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this.emit('statusUpdate', `Reconnecting in ${Math.ceil(delay / 1000)}s...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  public disconnect(): void {
    console.log('Disconnecting WebSocket...');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionState = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    this.emit('connectionChange', false);
    this.emit('statusUpdate', 'Disconnected');
  }

  public sendMessage(message: any): void {
    if (!this.connectionState || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(messageStr);
      console.log('WebSocket message sent:', message);
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.emit('error', new Error('Failed to send message'));
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.connectionState && this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): number | undefined {
    return this.ws?.readyState;
  }
}

/**
 * Get or generate public access token for status boards
 */
export async function getPublicToken(): Promise<string | null> {
  try {
    const PUBLIC_TOKEN_KEY = 'buzzword-bingo-public-token';
    const DEVICE_ID_KEY = 'buzzword-bingo-device-id';

    // Check if we already have a valid token
    const existingToken = localStorage.getItem(PUBLIC_TOKEN_KEY);
    const existingDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (existingToken && existingDeviceId) {
      console.log('Using existing public token for device:', existingDeviceId);
      return existingToken;
    }

    // Generate new public token
    console.log('Generating new public token...');
    const response = await API.post('api', '/public/token', {
      body: {
        deviceId: existingDeviceId || undefined
      }
    });

    if (response.success) {
      // Store the token and device ID in localStorage
      localStorage.setItem(PUBLIC_TOKEN_KEY, response.publicToken);
      localStorage.setItem(DEVICE_ID_KEY, response.deviceId);
      
      console.log('Generated public token for device:', response.deviceId);
      return response.publicToken;
    } else {
      console.error('Failed to generate public token:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Error getting public token:', error);
    return null;
  }
} 