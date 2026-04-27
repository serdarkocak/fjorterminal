/**
 * Global Binance Futures WebSocket Manager
 * Singleton pattern - uygulama boyunca sadece 1 WebSocket bağlantısı
 */

class BinanceWebSocketManager {
  constructor() {
    this.ws = null;
    this.subscribers = new Map(); // { symbol: Set<callback> }
    this.allSymbols = new Set(); // Tüm takip edilen coinler
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.prices = {}; // Cache for prices
    this.currentUrl = null; // Current WebSocket URL
    this.updateConnectionTimeout = null; // Debounce for updateConnection
  }

  /**
   * Subscribe to price updates for a symbol
   * @param {string} symbol - Coin symbol (e.g., 'BTC', 'ETH')
   * @param {Function} callback - Callback function to receive updates
   * @returns {Function} Unsubscribe function
   */
  subscribe(symbol, callback) {
    if (!symbol || !callback) return () => {};

    const upperSymbol = symbol.toUpperCase();
    
    if (!this.subscribers.has(upperSymbol)) {
      this.subscribers.set(upperSymbol, new Set());
    }
    
    this.subscribers.get(upperSymbol).add(callback);
    this.allSymbols.add(upperSymbol);

    // Eğer zaten veri varsa, hemen gönder
    if (this.prices[upperSymbol]) {
      callback(this.prices[upperSymbol]);
    }

    // WebSocket'i güncelle (yeni coin eklendi) - debounced
    if (this.updateConnectionTimeout) {
      clearTimeout(this.updateConnectionTimeout);
    }
    this.updateConnectionTimeout = setTimeout(() => {
      this.updateConnection();
    }, 50); // 50ms debounce

    // Unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(upperSymbol);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(upperSymbol);
          this.allSymbols.delete(upperSymbol);
          // Eğer hiç subscriber kalmadıysa, WebSocket'i kapat
          if (this.subscribers.size === 0) {
            this.disconnect();
          } else {
            // Yeni coin listesiyle bağlantıyı güncelle
            this.updateConnection();
          }
        }
      }
    };
  }

  /**
   * Update WebSocket connection with current symbols
   */
  updateConnection() {
    if (this.allSymbols.size === 0) {
      this.disconnect();
      return;
    }

    // Debounce: Eğer zaten bağlanıyorsa, bekle
    if (this.isConnecting) {
      return;
    }

    // Eğer bağlantı yoksa, bağlan
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      return;
    }

    // Bağlantı açık ama coin listesi değişmiş olabilir
    // Binance combined stream için yeni URL oluştur
    const currentStreams = this.buildStreams();
    const currentUrl = this.buildUrl(currentStreams);
    
    // Eğer URL değiştiyse, yeniden bağlan
    if (this.currentUrl && this.currentUrl !== currentUrl) {
      this.disconnect();
      // Kısa bir delay ile bağlan (eski bağlantının kapanması için)
      setTimeout(() => {
        this.connect();
      }, 100);
    } else if (!this.currentUrl) {
      // İlk bağlantı, URL'i kaydet
      this.currentUrl = currentUrl;
    }
  }

  /**
   * Build streams array for all symbols
   */
  buildStreams() {
    const streams = [];
    this.allSymbols.forEach(symbol => {
      const symbolLower = symbol.toLowerCase();
      streams.push(`${symbolLower}usdt@miniTicker`);
      streams.push(`${symbolLower}usdt@kline_4h`);
    });
    return streams;
  }

  /**
   * Build WebSocket URL
   */
  buildUrl(streams) {
    const streamsStr = streams.join('/');
    return `wss://fstream.binance.com/market/stream?streams=${streamsStr}`;
  }

  /**
   * Connect to Binance WebSocket
   */
  connect() {
    if (this.isConnecting || this.allSymbols.size === 0) {
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    this.isConnecting = true;
    const streams = this.buildStreams();
    const url = this.buildUrl(streams);
    this.currentUrl = url;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.stream && message.data) {
            const data = message.data;
            const streamName = message.stream;
            
            // Extract symbol from stream name (btcusdt@miniTicker -> BTC)
            // Handle both formats: btcusdt@miniTicker and btc@miniTicker
            let symbol = streamName.split('@')[0];
            if (symbol.endsWith('usdt')) {
              symbol = symbol.replace('usdt', '');
            }
            symbol = symbol.toUpperCase();
            
            // Handle miniTicker stream (24h data)
            if (streamName.includes('@miniTicker')) {
              const currentPrice = parseFloat(data.c);
              const openPrice24h = parseFloat(data.o);
              const change24h = currentPrice - openPrice24h;
              const changePercent24h = openPrice24h > 0 
                ? (change24h / openPrice24h) * 100 
                : 0;
              
              const priceData = {
                symbol: symbol,
                price: currentPrice,
                change24h: change24h,
                changePercent24h: changePercent24h,
                high24h: parseFloat(data.h),
                low24h: parseFloat(data.l),
                volume24h: parseFloat(data.v),
                quoteVolume24h: parseFloat(data.q),
                openPrice: openPrice24h,
                lastUpdate: new Date().toISOString()
              };

              // Update cache
              this.prices[symbol] = {
                ...this.prices[symbol],
                ...priceData
              };

              // Notify subscribers
              const callbacks = this.subscribers.get(symbol);
              if (callbacks) {
                callbacks.forEach(callback => {
                  try {
                    callback(this.prices[symbol]);
                  } catch (error) {
                    // Silent error handling
                  }
                });
              }
            }
            
            // Handle kline stream (4h candlestick data)
            if (streamName.includes('@kline_4h')) {
              const kline = data.k;
              const openPrice4h = parseFloat(kline.o);
              const closePrice4h = parseFloat(kline.c);
              const change4h = closePrice4h - openPrice4h;
              const changePercent4h = openPrice4h > 0 
                ? (change4h / openPrice4h) * 100 
                : 0;
              
              // Update cache
              this.prices[symbol] = {
                ...this.prices[symbol],
                change4h: change4h,
                changePercent4h: changePercent4h,
                high4h: parseFloat(kline.h),
                low4h: parseFloat(kline.l)
              };

              // Notify subscribers
              const callbacks = this.subscribers.get(symbol);
              if (callbacks) {
                callbacks.forEach(callback => {
                  try {
                    callback(this.prices[symbol]);
                  } catch (error) {
                    // Silent error handling
                  }
                });
              }
            }
          }
        } catch (err) {
          // Silent error handling
        }
      };

      this.ws.onerror = (event) => {
        this.isConnecting = false;
      };

      this.ws.onclose = (event) => {
        this.isConnecting = false;
        this.ws = null;

        // Auto-reconnect if not a clean close
        if (event.code !== 1000 && event.code !== 1001 && 
            this.reconnectAttempts < this.maxReconnectAttempts &&
            this.allSymbols.size > 0) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, delay);
        }
      };
    } catch (error) {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.updateConnectionTimeout) {
      clearTimeout(this.updateConnectionTimeout);
      this.updateConnectionTimeout = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || 
          this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Manager disconnect');
      }
      this.ws = null;
    }

    this.isConnecting = false;
    this.currentUrl = null;
  }

  /**
   * Get current price for a symbol (from cache)
   */
  getPrice(symbol) {
    return this.prices[symbol.toUpperCase()] || null;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
const binanceWebSocketManager = new BinanceWebSocketManager();

export default binanceWebSocketManager;
