import { useEffect, useState, useCallback, useRef } from 'react';
import signalRService from '../services/signalRService';

/**
 * Custom hook for SignalR real-time updates
 * @param {Object} options - Hook options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {string[]} options.symbols - Symbols to subscribe to
 * @returns {Object} SignalR hook state and methods
 */
export const useSignalR = (options = {}) => {
  const {
    autoConnect = true,
    symbols = []
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('Disconnected');
  const [prices, setPrices] = useState({});
  const [positions, setPositions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  const subscribedSymbolsRef = useRef(new Set());
  const listenersRef = useRef([]);

  // Connect to SignalR
  const connect = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      await signalRService.connect(token);
      setIsConnected(true);
      setConnectionState('Connected');
      setError(null);
    } catch (err) {
      console.error('SignalR connection error:', err);
      setError(err.message);
      setIsConnected(false);
      setConnectionState('Disconnected');
    }
  }, []);

  // Disconnect from SignalR
  const disconnect = useCallback(async () => {
    await signalRService.disconnect();
    setIsConnected(false);
    setConnectionState('Disconnected');
    subscribedSymbolsRef.current.clear();
  }, []);

  // Subscribe to a symbol
  const subscribeToSymbol = useCallback(async (symbol) => {
    if (!subscribedSymbolsRef.current.has(symbol)) {
      await signalRService.subscribeToSymbol(symbol);
      subscribedSymbolsRef.current.add(symbol);
    }
  }, []);

  // Unsubscribe from a symbol
  const unsubscribeFromSymbol = useCallback(async (symbol) => {
    if (subscribedSymbolsRef.current.has(symbol)) {
      await signalRService.unsubscribeFromSymbol(symbol);
      subscribedSymbolsRef.current.delete(symbol);
    }
  }, []);

  // Subscribe to multiple symbols
  const subscribeToSymbols = useCallback(async (symbolList) => {
    for (const symbol of symbolList) {
      await subscribeToSymbol(symbol);
    }
  }, [subscribeToSymbol]);

  // Send a message
  const sendMessage = useCallback(async (message) => {
    await signalRService.sendMessage(message);
  }, []);

  // Setup event listeners
  useEffect(() => {
    // Price Update listener
    const unsubPriceUpdate = signalRService.on('PriceUpdate', (data) => {
      setPrices(prev => ({
        ...prev,
        [data.symbol]: {
          price: data.price,
          timestamp: data.timestamp
        }
      }));
    });

    // Position Update listener
    const unsubPositionUpdate = signalRService.on('PositionUpdate', (data) => {
      setPositions(data);
    });

    // Balance Update listener
    const unsubBalanceUpdate = signalRService.on('BalanceUpdate', (data) => {
      setBalance(data);
    });

    // Notification listener
    const unsubNotification = signalRService.on('Notification', (data) => {
      setNotifications(prev => [...prev, data]);
    });

    // Connection state listeners
    const unsubConnected = signalRService.on('Connected', () => {
      setIsConnected(true);
      setConnectionState('Connected');
      setError(null);
    });

    const unsubReconnecting = signalRService.on('Reconnecting', () => {
      setConnectionState('Reconnecting');
    });

    const unsubReconnected = signalRService.on('Reconnected', () => {
      setIsConnected(true);
      setConnectionState('Connected');
      setError(null);
      
      // Re-subscribe to all symbols after reconnection
      subscribedSymbolsRef.current.forEach(symbol => {
        signalRService.subscribeToSymbol(symbol);
      });
    });

    const unsubConnectionClosed = signalRService.on('ConnectionClosed', (data) => {
      setIsConnected(false);
      setConnectionState('Disconnected');
      if (data.error) {
        setError(data.error.message);
      }
    });

    // Store unsubscribe functions
    listenersRef.current = [
      unsubPriceUpdate,
      unsubPositionUpdate,
      unsubBalanceUpdate,
      unsubNotification,
      unsubConnected,
      unsubReconnecting,
      unsubReconnected,
      unsubConnectionClosed
    ];

    return () => {
      // Cleanup listeners
      listenersRef.current.forEach(unsub => unsub());
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  // Subscribe to symbols
  useEffect(() => {
    if (isConnected && symbols.length > 0) {
      subscribeToSymbols(symbols);
    }
  }, [isConnected, symbols, subscribeToSymbols]);

  return {
    // State
    isConnected,
    connectionState,
    prices,
    positions,
    balance,
    notifications,
    error,
    
    // Methods
    connect,
    disconnect,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    subscribeToSymbols,
    sendMessage,
    
    // Utilities
    clearNotifications: () => setNotifications([]),
    getPrice: (symbol) => prices[symbol]?.price || null
  };
};

export default useSignalR;

