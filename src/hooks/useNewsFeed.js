import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllNews, clearNewsCache } from '../services/newsApi';
import logger from '../utils/logger';

/**
 * Custom hook for managing real-time news feed
 * Updates every 15 seconds by default
 * @param {number} updateInterval - Update interval in milliseconds (0 = no auto-update)
 */
export const useNewsFeed = (updateInterval = 15000) => { // 15 seconds default
  const [newsData, setNewsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  
  const intervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const maxRetries = 3;

  const fetchNews = useCallback(async () => {
    try {
      logger.info('Fetching news data...');
      setIsLoading(true);
      setError(null);
      
      const result = await fetchAllNews();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setNewsData(result.items || []);
      setLastUpdate(new Date());
      setIsConnected(true);
      setRetryCount(0);
      setSuccessCount(result.successCount || 0);
      setErrorCount(result.errorCount || 0);
      
      logger.info(`News fetched successfully: ${result.totalItems} items from ${result.successCount} sources`);
    } catch (err) {
      logger.error('Error fetching news', err);
      setError(err.message);
      setIsConnected(false);
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        logger.warn(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchNews();
        }, delay);
      } else {
        logger.error('Max retries reached, stopping retry attempts');
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  const refreshNews = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setRetryCount(0);
    clearNewsCache();
    fetchNews();
  }, [fetchNews]);

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, []);

  // Polling interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (updateInterval > 0) {
      logger.info(`Setting news update interval to ${updateInterval}ms`);
      intervalRef.current = setInterval(() => {
        fetchNews();
      }, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateInterval, fetchNews]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Stale data detection
  useEffect(() => {
    const checkStale = () => {
      if (lastUpdate && (new Date() - lastUpdate > updateInterval + 5000)) { // 5s grace period
        setIsStale(true);
      } else {
        setIsStale(false);
      }
    };

    const staleInterval = setInterval(checkStale, 5000); // Check every 5 seconds
    return () => clearInterval(staleInterval);
  }, [lastUpdate, updateInterval]);

  const getLastUpdateString = useCallback(() => {
    if (!lastUpdate) return 'N/A';
    const now = new Date();
    const diffSeconds = Math.floor((now - lastUpdate) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, [lastUpdate]);

  const getNewsByCategory = useCallback((category) => {
    if (category === 'all') {
      return newsData;
    }
    return newsData.filter(item => item.category === category);
  }, [newsData]);

  const getNewsBySource = useCallback((sourceId) => {
    return newsData.filter(item => item.sourceId === sourceId);
  }, [newsData]);

  const getConnectionStatus = useCallback(() => {
    if (isConnected && successCount > 0) {
      return {
        status: 'connected',
        message: `${successCount} sources connected`,
        color: 'green'
      };
    } else if (isConnected && successCount === 0 && errorCount > 0) {
      return {
        status: 'partial',
        message: `${errorCount} sources failed`,
        color: 'yellow'
      };
    } else {
      return {
        status: 'disconnected',
        message: 'No sources connected',
        color: 'red'
      };
    }
  }, [isConnected, successCount, errorCount]);

  return {
    newsData,
    isLoading,
    error,
    isConnected,
    isStale,
    lastUpdate,
    retryCount,
    successCount,
    errorCount,
    refreshNews,
    getLastUpdateString,
    getNewsByCategory,
    getNewsBySource,
    getConnectionStatus,
    totalItems: newsData.length
  };
};

export default useNewsFeed;
