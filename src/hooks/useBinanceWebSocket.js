import { useState, useEffect, useRef } from 'react';
import binanceWebSocketManager from '../services/binanceWebSocketManager';

/**
 * Binance Futures WebSocket hook for real-time price updates
 * Uses global Binance WebSocket manager (singleton pattern)
 * 
 * @param {string[]} symbols - Array of crypto symbols (e.g., ['BTC', 'ETH', 'XRP'])
 * @returns {Object} Real-time prices and connection state
 */
export const useBinanceWebSocket = (symbols = []) => {
  const [prices, setPrices] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    // Don't connect if no symbols
    if (!symbols || symbols.length === 0) {
      setPrices({});
      setIsConnected(false);
      return;
    }

    // Subscribe to each symbol
    const unsubscribes = symbols.map(symbol => {
      const upperSymbol = symbol.toUpperCase();
      return binanceWebSocketManager.subscribe(upperSymbol, (priceData) => {
        if (priceData) {
          // Use the symbol from priceData (manager ensures it's uppercase)
          const dataSymbol = priceData.symbol || upperSymbol;
          setPrices(prevPrices => ({
            ...prevPrices,
            [dataSymbol]: priceData
          }));
        }
      });
    });

    unsubscribeRefs.current = unsubscribes;

    // Update connection state
    setIsConnected(binanceWebSocketManager.isConnected());

    // Check connection state periodically (WebSocket manager doesn't expose events)
    const connectionCheckInterval = setInterval(() => {
      setIsConnected(binanceWebSocketManager.isConnected());
    }, 1000);

    // Cleanup on unmount or when symbols change
    return () => {
      clearInterval(connectionCheckInterval);
      // Unsubscribe from all symbols
      unsubscribeRefs.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribeRefs.current = [];
    };
  }, [symbols.join(',')]); // Reconnect when symbols change

  return {
    prices,
    isConnected,
    error
  };
};

