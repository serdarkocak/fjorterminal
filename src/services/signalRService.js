import * as signalR from '@microsoft/signalr';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5067';

class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  /**
   * Initialize SignalR connection
   * @param {string} accessToken - JWT access token
   * @returns {Promise<void>}
   */
  async connect(accessToken) {
    if (this.connection && this.isConnected) {
      console.log('✅ SignalR already connected');
      return;
    }

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/hubs/trading`, {
          accessTokenFactory: () => accessToken,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 32000);
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Connection event handlers
      this.connection.onclose((error) => {
        this.isConnected = false;
        console.log('❌ SignalR connection closed', error);
        this.notifyListeners('ConnectionClosed', { error });
      });

      this.connection.onreconnecting((error) => {
        this.isConnected = false;
        console.log('🔄 SignalR reconnecting...', error);
        this.notifyListeners('Reconnecting', { error });
      });

      this.connection.onreconnected((connectionId) => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('✅ SignalR reconnected', connectionId);
        this.notifyListeners('Reconnected', { connectionId });
      });

      // Register event handlers
      this.registerHandlers();

      // Start connection
      await this.connection.start();
      this.isConnected = true;
      console.log('✅ SignalR connected successfully');
      this.notifyListeners('Connected', { connectionId: this.connection.connectionId });

    } catch (error) {
      console.error('❌ SignalR connection error:', error);
      this.isConnected = false;
      
      // Retry connection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Retrying connection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(accessToken), 5000);
      }
      
      throw error;
    }
  }

  /**
   * Register all SignalR event handlers
   */
  registerHandlers() {
    if (!this.connection) return;

    // Connected event
    this.connection.on('Connected', (data) => {
      this.notifyListeners('Connected', data);
    });

    // Price Update event
    this.connection.on('PriceUpdate', (data) => {
      this.notifyListeners('PriceUpdate', data);
    });

    // Position Update event
    this.connection.on('PositionUpdate', (data) => {
      this.notifyListeners('PositionUpdate', data);
    });

    // Balance Update event
    this.connection.on('BalanceUpdate', (data) => {
      this.notifyListeners('BalanceUpdate', data);
    });

    // Order Update event
    this.connection.on('OrderUpdate', (data) => {
      this.notifyListeners('OrderUpdate', data);
    });

    // Notification event
    this.connection.on('Notification', (data) => {
      this.notifyListeners('Notification', data);
    });

    // Generic message event
    this.connection.on('ReceiveMessage', (userId, message) => {
      this.notifyListeners('ReceiveMessage', { userId, message });
    });
  }

  /**
   * Subscribe to a symbol for price updates
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
   */
  async subscribeToSymbol(symbol) {
    if (!this.connection || !this.isConnected) {
      console.warn('⚠️ SignalR not connected, cannot subscribe to symbol:', symbol);
      return;
    }

    try {
      await this.connection.invoke('SubscribeToSymbol', symbol);
      console.log(`✅ Subscribed to ${symbol}`);
    } catch (error) {
      console.error(`❌ Error subscribing to ${symbol}:`, error);
    }
  }

  /**
   * Unsubscribe from a symbol
   * @param {string} symbol - Trading symbol
   */
  async unsubscribeFromSymbol(symbol) {
    if (!this.connection || !this.isConnected) {
      return;
    }

    try {
      await this.connection.invoke('UnsubscribeFromSymbol', symbol);
      console.log(`✅ Unsubscribed from ${symbol}`);
    } catch (error) {
      console.error(`❌ Error unsubscribing from ${symbol}:`, error);
    }
  }

  /**
   * Send a message through SignalR
   * @param {string} message - Message to send
   */
  async sendMessage(message) {
    if (!this.connection || !this.isConnected) {
      console.warn('⚠️ SignalR not connected, cannot send message');
      return;
    }

    try {
      await this.connection.invoke('SendMessage', message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Notify all listeners for an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Disconnect SignalR connection
   */
  async disconnect() {
    if (this.connection) {
      try {
        await this.connection.stop();
        this.isConnected = false;
        this.listeners.clear();
        console.log('✅ SignalR disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting SignalR:', error);
      }
    }
  }

  /**
   * Get connection state
   * @returns {string} Connection state
   */
  getState() {
    if (!this.connection) return 'Disconnected';
    
    const states = {
      [signalR.HubConnectionState.Disconnected]: 'Disconnected',
      [signalR.HubConnectionState.Connecting]: 'Connecting',
      [signalR.HubConnectionState.Connected]: 'Connected',
      [signalR.HubConnectionState.Disconnecting]: 'Disconnecting',
      [signalR.HubConnectionState.Reconnecting]: 'Reconnecting'
    };
    
    return states[this.connection.state] || 'Unknown';
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnectionActive() {
    return this.isConnected && this.connection?.state === signalR.HubConnectionState.Connected;
  }
}

// Export singleton instance
const signalRService = new SignalRService();
export default signalRService;

