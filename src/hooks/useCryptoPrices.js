import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCryptoPrices } from '../services/cryptoApi';

/**
 * Custom hook for managing real-time cryptocurrency prices
 * @param {string[]} symbols - Array of crypto symbols to track
 * @param {number} updateInterval - Update interval in milliseconds (default: 30000 = 30 seconds)
 * @returns {Object} Hook state and methods
 */
export const useCryptoPrices = (symbols = ['BTC', 'ETH', 'XRP'], updateInterval = 5000) => {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  
  const intervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 2; // Reduce max retries
  const retryTimeoutRef = useRef(null);

  // Fetch prices function
  const fetchPrices = useCallback(async () => {
    try {
      console.log('Fetching crypto prices for symbols:', symbols);
      setError(null);
      const priceData = await fetchCryptoPrices(symbols);
      console.log('Received price data:', priceData);
      
      if (priceData && Object.keys(priceData).length > 0) {
        setPrices(priceData);
        setLastUpdate(new Date());
        setIsConnected(true);
        retryCountRef.current = 0; // Reset retry count on success
        console.log('Prices updated successfully');
      } else {
        throw new Error('No price data received');
      }
    } catch (err) {
      console.error('Failed to fetch crypto prices:', err);
      setError(err.message);
      setIsConnected(false);
      
      // Use fallback data after max retries
      if (retryCountRef.current >= maxRetries) {
        console.warn('Max retries reached, stopping attempts');
        retryCountRef.current = 0; // Reset retry count
      } else {
        // Exponential backoff for retries
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000); // Max 30 seconds
        console.log(`Retrying in ${backoffDelay}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);
        
        retryTimeoutRef.current = setTimeout(() => {
          retryCountRef.current++;
          fetchPrices();
        }, backoffDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [symbols.join(',')]); // Use symbols directly instead of fetchPrices

  // Set up interval for periodic updates
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only set interval if updateInterval > 0
    if (updateInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchPrices();
      }, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [symbols.join(','), updateInterval]); // Use symbols and updateInterval directly

  // Manual refresh function
  const refreshPrices = useCallback(() => {
    // Clear any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    retryCountRef.current = 0; // Reset retry count for manual refresh
    setLoading(true);
    fetchPrices();
  }, [symbols.join(',')]); // Use symbols instead of fetchPrices

  // Get price for specific symbol
  const getPrice = useCallback((symbol) => {
    return prices[symbol] || null;
  }, [prices]);

  // Get all prices as array
  const getPricesArray = useCallback(() => {
    return Object.values(prices);
  }, [prices]);

  // Check if price data is stale (older than 2 minutes)
  const isStale = useCallback(() => {
    if (!lastUpdate) return true;
    const now = new Date();
    const diff = now - lastUpdate;
    return diff > 120000; // 2 minutes
  }, [lastUpdate]);

  // Format last update time
  const getLastUpdateString = useCallback(() => {
    if (!lastUpdate) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - lastUpdate) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [lastUpdate]);

  return {
    prices,
    loading,
    error,
    lastUpdate,
    isConnected,
    isStale: isStale(),
    refreshPrices,
    getPrice,
    getPricesArray,
    getLastUpdateString
  };
};

/**
 * Hook for tracking a single cryptocurrency price
 * @param {string} symbol - Crypto symbol to track
 * @param {number} updateInterval - Update interval in milliseconds
 * @returns {Object} Single crypto price data
 */
export const useSingleCryptoPrice = (symbol, updateInterval = 30000) => {
  const { prices, loading, error, lastUpdate, isConnected, refreshPrices } = useCryptoPrices([symbol], updateInterval);
  
  return {
    price: prices[symbol] || null,
    loading,
    error,
    lastUpdate,
    isConnected,
    refreshPrices
  };
};

/**
 * Hook for tracking price changes with animation support
 * @param {string} symbol - Crypto symbol to track
 * @param {number} updateInterval - Update interval in milliseconds
 * @returns {Object} Price data with change tracking
 */
export const useCryptoPriceWithChanges = (symbol, updateInterval = 30000) => {
  const [previousPrice, setPreviousPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { price, loading, error, lastUpdate, isConnected, refreshPrices } = useSingleCryptoPrice(symbol, updateInterval);

  // Track price changes
  useEffect(() => {
    if (price && previousPrice) {
      const change = price.price - previousPrice.price;
      setPriceChange({
        amount: change,
        percentage: previousPrice.price > 0 ? (change / previousPrice.price) * 100 : 0,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
      });
      
      // Show updating animation briefly
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 1000);
    }
    
    if (price) {
      setPreviousPrice(price);
    }
  }, [price, previousPrice]);

  return {
    price,
    priceChange,
    isUpdating,
    loading,
    error,
    lastUpdate,
    isConnected,
    refreshPrices
  };
};
