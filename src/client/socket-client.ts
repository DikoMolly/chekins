/**
 * Example client-side code for connecting to the WebSocket server
 * This would be used in your frontend application
 */

import { io, Socket } from 'socket.io-client';

class MessageSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private serverUrl: string) {}

  /**
   * Connect to the WebSocket server
   * @param token JWT auth token
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        });

        this.socket.on('connect', () => {
          console.log('Connected to message server');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.reconnectAttempts++;

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(
              new Error(
                'Failed to connect to message server after multiple attempts',
              ),
            );
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from message server:', reason);
          this.notifyListeners('connection_state', {
            connected: false,
            reason,
          });
        });

        // Set up heartbeat
        setInterval(() => {
          if (this.socket?.connected) {
            this.socket.emit('heartbeat');
          }
        }, 30000); // 30 seconds

        // Set up default event handlers
        this.setupDefaultEventHandlers();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Set up default event handlers for common message events
   */
  private setupDefaultEventHandlers(): void {
    if (!this.socket) return;

    // New message received
    this.socket.on('new_message', (data) => {
      this.notifyListeners('message', data);
    });

    // Message status updates (read, delivered)
    this.socket.on('message_status_update', (data) => {
      this.notifyListeners('message_status', data);
    });

    // User typing indicator
    this.socket.on('conversation_event', (data) => {
      if (data.event === 'typing_indicator') {
        this.notifyListeners('typing', data.data);
      } else {
        this.notifyListeners(data.event, data.data);
      }
    });

    // User online status updates
    this.socket.on('user_status', (data) => {
      this.notifyListeners('user_status', data);
    });

    // Message deleted
    this.socket.on('message_deleted', (data) => {
      this.notifyListeners('message_deleted', data);
    });

    // Messages marked as read
    this.socket.on('messages_read', (data) => {
      this.notifyListeners('messages_read', data);
    });
  }

  /**
   * Send a typing indicator
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    if (!this.socket?.connected) return;

    this.socket.emit('typing', {
      conversationId,
      isTyping,
    });
  }

  /**
   * Mark a message as delivered
   */
  markMessageDelivered(messageId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('message_delivered', {
      messageId,
    });
  }

  /**
   * Add an event listener
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)?.add(callback);

    // Return a function to remove the listener
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if connected to the WebSocket server
   */
  isConnected(): boolean {
    return !!this.socket?.connected;
  }
}

export default MessageSocketClient;
