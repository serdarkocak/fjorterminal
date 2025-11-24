// Crypto API service for fetching real-time cryptocurrency prices
// Using multiple Binance API endpoints for maximum reliability

// Multiple Binance API endpoints for failover (using proxy)
const BINANCE_API_ENDPOINTS = [
  '/api/binance',  // Proxy endpoint - primary
  '/api/binance',  // Proxy endpoint - backup
  '/api/binance',  // Proxy endpoint - backup
  '/api/binance',  // Proxy endpoint - backup
  '/api/binance',  // Proxy endpoint - backup
  '/api/binance'   // Proxy endpoint - backup
];

// Simple cache to reduce API calls
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds cache

// Crypto symbols mapping to Binance trading pairs (for special cases)
export const CRYPTO_SYMBOLS = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  SOL: 'SOLUSDT',
  MATIC: 'MATICUSDT',
  POL: 'POLUSDT',
  DOT: 'DOTUSDT',
  AVAX: 'AVAXUSDT',
  LINK: 'LINKUSDT',
  UNI: 'UNIUSDT',
  LTC: 'LTCUSDT',
  BNB: 'BNBUSDT',
  DOGE: 'DOGEUSDT',
  SHIB: 'SHIBUSDT',
  AAVE: 'AAVEUSDT',
  COMP: 'COMPUSDT',
  MKR: 'MKRUSDT',
  CRV: 'CRVUSDT',
  YFI: 'YFIUSDT'
  // Note: All other coins are handled dynamically as SYMBOLUSDT
};

/**
 * Try to fetch data from a single Binance API endpoint
 * @param {string} endpoint - API endpoint URL
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<Object>} API response data
 */
const fetchFromEndpoint = async (endpoint, symbol) => {
  // All endpoints are now proxy endpoints
  const apiUrl = `${endpoint}/ticker/24hr?symbol=${symbol}`;
    
  console.log(`Trying endpoint: ${endpoint} for symbol: ${symbol}`);
  console.log(`Full URL: ${apiUrl}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout per endpoint

  try {
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        // Removed 'Content-Type' header to fix CORS preflight issue
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Success from ${endpoint} for ${symbol}`);
    return { success: true, data, endpoint };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(`❌ Failed from ${endpoint} for ${symbol}:`, error.message);
    return { success: false, error: error.message, endpoint };
  }
};

/**
 * Fetch data for a single symbol with failover across multiple endpoints
 * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @returns {Promise<Object>} Price data or error
 */
const fetchSymbolWithFailover = async (symbol) => {
  console.log(`Fetching data for ${symbol} with failover...`);

  // Try each endpoint until one succeeds
  for (let i = 0; i < BINANCE_API_ENDPOINTS.length; i++) {
    const endpoint = BINANCE_API_ENDPOINTS[i];
    const result = await fetchFromEndpoint(endpoint, symbol);

    if (result.success) {
      return {
        symbol: symbol,
        price: parseFloat(result.data.lastPrice) || 0,
        change: parseFloat(result.data.priceChange) || 0,
        changePercent: parseFloat(result.data.priceChangePercent) || 0,
        volume24h: parseFloat(result.data.volume) || 0,
        lastUpdated: new Date().toISOString(),
        endpoint: result.endpoint
      };
    }

    // If not the last endpoint, wait a bit before trying the next one
    if (i < BINANCE_API_ENDPOINTS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    }
  }

  // All endpoints failed
  throw new Error(`All Binance API endpoints failed for ${symbol}`);
};

/**
 * Fetch real-time price data for multiple cryptocurrencies
 * @param {string[]} symbols - Array of crypto symbols (e.g., ['BTC', 'ETH', 'XRP'])
 * @returns {Promise<Object>} Price data object
 */
export const fetchCryptoPrices = async (symbols = ['BTC', 'ETH', 'XRP']) => {
  try {
    console.log('🚀 fetchCryptoPrices called with symbols:', symbols);
    
    // Check cache first
    const cacheKey = symbols.sort().join(',');
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Using cached data for symbols:', symbols);
      return cached.data;
    }
    
    // Convert symbols to Binance trading pairs (dynamic approach)
    const tradingPairs = symbols
      .map(symbol => {
        // First check static mapping
        if (CRYPTO_SYMBOLS[symbol]) {
          return CRYPTO_SYMBOLS[symbol];
        }
        // If not found, create dynamic USDT pair
        return `${symbol}USDT`;
      })
      .filter(Boolean);

    console.log('🔄 Binance trading pairs (dynamic):', tradingPairs);

    if (tradingPairs.length === 0) {
      throw new Error('No valid crypto symbols provided');
    }

    // Fetch data for all symbols in parallel with failover
    const promises = tradingPairs.map(async (pair) => {
      try {
        return await fetchSymbolWithFailover(pair);
      } catch (error) {
        console.error(`❌ Failed to fetch data for ${pair}:`, error.message);
        return {
          symbol: pair,
          price: 0,
          change: 0,
          changePercent: 0,
          volume24h: 0,
          lastUpdated: new Date().toISOString(),
          error: error.message
        };
      }
    });

    const results = await Promise.all(promises);
    console.log('📊 All API results:', results);

    // Transform data to our format
    const transformedData = {};
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const originalSymbol = symbols[i]; // Get original symbol from input
      
      // Extract base symbol from trading pair (e.g., BTCUSDT -> BTC)
      const baseSymbol = result.symbol.replace('USDT', '');
      
      transformedData[originalSymbol] = {
        symbol: `$${originalSymbol}`,
        price: result.price,
        change: result.change,
        changePercent: result.changePercent,
        volume24h: result.volume24h,
        lastUpdated: result.lastUpdated,
        endpoint: result.endpoint || 'failed',
        error: result.error || null,
        tradingPair: result.symbol // Include the actual trading pair used
      };
    }

    console.log('✅ Transformed data:', transformedData);

    // Cache the result
    cache.set(cacheKey, {
      data: transformedData,
      timestamp: Date.now()
    });

    return transformedData;

  } catch (error) {
    console.error('💥 Error in fetchCryptoPrices:', error);
    throw error;
  }
};

/**
 * Test all Binance API endpoints
 * @returns {Promise<Object>} Test results for each endpoint
 */
export const testAllEndpoints = async () => {
  console.log('🧪 Testing all Binance API endpoints...');
  const testSymbol = 'BTCUSDT';
  const results = {};

  for (const endpoint of BINANCE_API_ENDPOINTS) {
    const result = await fetchFromEndpoint(endpoint, testSymbol);
    results[endpoint] = result;
  }

  console.log('📋 Endpoint test results:', results);
  return results;
};

/**
 * Get available crypto symbols
 * @returns {string[]} Array of available crypto symbols
 */
export const getAvailableSymbols = () => {
  return Object.keys(CRYPTO_SYMBOLS);
};

/**
 * Fetch all active cryptocurrency symbols from Binance
 * @returns {Promise<Array>} Array of all active crypto symbols
 */
export const fetchAllCryptoSymbols = async () => {
  try {
    console.log('🚀 Fetching all crypto symbols from Binance...');
    
    const response = await fetch('/api/binance/exchangeInfo');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.symbols) {
      throw new Error('No symbols data received');
    }
    
    // Filter USDT pairs and extract base symbols
    const usdtPairs = data.symbols
      .filter(symbol => 
        symbol.symbol.endsWith('USDT') && 
        symbol.status === 'TRADING' &&
        symbol.isSpotTradingAllowed
      )
      .map(symbol => ({
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        quoteAsset: symbol.quoteAsset,
        name: symbol.baseAsset // Use base asset as name
      }))
      .sort((a, b) => a.baseAsset.localeCompare(b.baseAsset));
    
    console.log(`✅ Found ${usdtPairs.length} active USDT pairs`);
    return usdtPairs;
    
  } catch (error) {
    console.error('❌ Error fetching all crypto symbols:', error);
    
    // Fallback to a comprehensive static list
    return getFallbackCryptoSymbols();
  }
};

// Fallback static list of major cryptocurrencies
const getFallbackCryptoSymbols = () => {
  return [
    { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', name: 'Bitcoin' },
    { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', name: 'Ethereum' },
    { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', name: 'Ripple' },
    { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', name: 'Cardano' },
    { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', name: 'Solana' },
    { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT', name: 'Polkadot' },
    { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT', name: 'Chainlink' },
    { symbol: 'LTCUSDT', baseAsset: 'LTC', quoteAsset: 'USDT', name: 'Litecoin' },
    { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', name: 'Binance Coin' },
    { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', name: 'Dogecoin' },
    { symbol: 'SHIBUSDT', baseAsset: 'SHIB', quoteAsset: 'USDT', name: 'Shiba Inu' },
    { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', name: 'Avalanche' },
    { symbol: 'MATICUSDT', baseAsset: 'MATIC', quoteAsset: 'USDT', name: 'Polygon' },
    { symbol: 'POLUSDT', baseAsset: 'POL', quoteAsset: 'USDT', name: 'Polygon' },
    { symbol: 'UNIUSDT', baseAsset: 'UNI', quoteAsset: 'USDT', name: 'Uniswap' },
    { symbol: 'AAVEUSDT', baseAsset: 'AAVE', quoteAsset: 'USDT', name: 'Aave' },
    { symbol: 'COMPUSDT', baseAsset: 'COMP', quoteAsset: 'USDT', name: 'Compound' },
    { symbol: 'MKRUSDT', baseAsset: 'MKR', quoteAsset: 'USDT', name: 'Maker' },
    { symbol: 'CRVUSDT', baseAsset: 'CRV', quoteAsset: 'USDT', name: 'Curve' },
    { symbol: 'YFIUSDT', baseAsset: 'YFI', quoteAsset: 'USDT', name: 'Yearn Finance' },
    { symbol: 'SUSHIUSDT', baseAsset: 'SUSHI', quoteAsset: 'USDT', name: 'SushiSwap' },
    { symbol: '1INCHUSDT', baseAsset: '1INCH', quoteAsset: 'USDT', name: '1inch' },
    { symbol: 'ALPHAUSDT', baseAsset: 'ALPHA', quoteAsset: 'USDT', name: 'Alpha Finance' },
    { symbol: 'BALUSDT', baseAsset: 'BAL', quoteAsset: 'USDT', name: 'Balancer' },
    { symbol: 'BANDUSDT', baseAsset: 'BAND', quoteAsset: 'USDT', name: 'Band Protocol' },
    { symbol: 'BATUSDT', baseAsset: 'BAT', quoteAsset: 'USDT', name: 'Basic Attention Token' },
    { symbol: 'BCHUSDT', baseAsset: 'BCH', quoteAsset: 'USDT', name: 'Bitcoin Cash' },
    { symbol: 'CELRUSDT', baseAsset: 'CELR', quoteAsset: 'USDT', name: 'Celer Network' },
    { symbol: 'CHZUSDT', baseAsset: 'CHZ', quoteAsset: 'USDT', name: 'Chiliz' },
    { symbol: 'ENJUSDT', baseAsset: 'ENJ', quoteAsset: 'USDT', name: 'Enjin Coin' },
    { symbol: 'FILUSDT', baseAsset: 'FIL', quoteAsset: 'USDT', name: 'Filecoin' },
    { symbol: 'GRTUSDT', baseAsset: 'GRT', quoteAsset: 'USDT', name: 'The Graph' },
    { symbol: 'ICPUSDT', baseAsset: 'ICP', quoteAsset: 'USDT', name: 'Internet Computer' },
    { symbol: 'KAVAUSDT', baseAsset: 'KAVA', quoteAsset: 'USDT', name: 'Kava' },
    { symbol: 'KSMUSDT', baseAsset: 'KSM', quoteAsset: 'USDT', name: 'Kusama' },
    { symbol: 'MANAUSDT', baseAsset: 'MANA', quoteAsset: 'USDT', name: 'Decentraland' },
    { symbol: 'NEARUSDT', baseAsset: 'NEAR', quoteAsset: 'USDT', name: 'NEAR Protocol' },
    { symbol: 'OCEANUSDT', baseAsset: 'OCEAN', quoteAsset: 'USDT', name: 'Ocean Protocol' },
    { symbol: 'OMGUSDT', baseAsset: 'OMG', quoteAsset: 'USDT', name: 'OMG Network' },
    { symbol: 'QTUMUSDT', baseAsset: 'QTUM', quoteAsset: 'USDT', name: 'Qtum' },
    { symbol: 'RENUSDT', baseAsset: 'REN', quoteAsset: 'USDT', name: 'Ren' },
    { symbol: 'SNXUSDT', baseAsset: 'SNX', quoteAsset: 'USDT', name: 'Synthetix' },
    { symbol: 'STORJUSDT', baseAsset: 'STORJ', quoteAsset: 'USDT', name: 'Storj' },
    { symbol: 'SXPUSDT', baseAsset: 'SXP', quoteAsset: 'USDT', name: 'Swipe' },
    { symbol: 'THETAUSDT', baseAsset: 'THETA', quoteAsset: 'USDT', name: 'Theta Network' },
    { symbol: 'VETUSDT', baseAsset: 'VET', quoteAsset: 'USDT', name: 'VeChain' },
    { symbol: 'ZECUSDT', baseAsset: 'ZEC', quoteAsset: 'USDT', name: 'Zcash' },
    { symbol: 'ZILUSDT', baseAsset: 'ZIL', quoteAsset: 'USDT', name: 'Zilliqa' }
  ];
};

/**
 * Create dynamic crypto detection keywords from all available symbols
 * @param {Array} allSymbols - Array of all crypto symbols from API
 * @returns {Object} Dynamic crypto keywords object
 */
export const createDynamicCryptoKeywords = (allSymbols) => {
  const keywords = {};
  
  allSymbols.forEach(coin => {
    const baseAsset = coin.baseAsset.toLowerCase();
    
    // Add main symbol
    keywords[baseAsset] = {
      symbol: coin.symbol,
      name: coin.name
    };
    
    // Add common variations
    if (baseAsset === 'btc') {
      keywords['bitcoin'] = { symbol: coin.symbol, name: 'Bitcoin' };
    } else if (baseAsset === 'eth') {
      keywords['ethereum'] = { symbol: coin.symbol, name: 'Ethereum' };
    } else if (baseAsset === 'xrp') {
      keywords['ripple'] = { symbol: coin.symbol, name: 'Ripple' };
    } else if (baseAsset === 'ada') {
      keywords['cardano'] = { symbol: coin.symbol, name: 'Cardano' };
    } else if (baseAsset === 'sol') {
      keywords['solana'] = { symbol: coin.symbol, name: 'Solana' };
    } else if (baseAsset === 'dot') {
      keywords['polkadot'] = { symbol: coin.symbol, name: 'Polkadot' };
    } else if (baseAsset === 'link') {
      keywords['chainlink'] = { symbol: coin.symbol, name: 'Chainlink' };
    } else if (baseAsset === 'ltc') {
      keywords['litecoin'] = { symbol: coin.symbol, name: 'Litecoin' };
    } else if (baseAsset === 'bnb') {
      keywords['binance'] = { symbol: coin.symbol, name: 'Binance Coin' };
    } else if (baseAsset === 'doge') {
      keywords['dogecoin'] = { symbol: coin.symbol, name: 'Dogecoin' };
    } else if (baseAsset === 'shib') {
      keywords['shiba'] = { symbol: coin.symbol, name: 'Shiba Inu' };
    } else if (baseAsset === 'avax') {
      keywords['avalanche'] = { symbol: coin.symbol, name: 'Avalanche' };
    } else if (baseAsset === 'matic') {
      keywords['polygon'] = { symbol: coin.symbol, name: 'Polygon' };
    } else if (baseAsset === 'pol') {
      keywords['polygon'] = { symbol: coin.symbol, name: 'Polygon' };
    } else if (baseAsset === 'uni') {
      keywords['uniswap'] = { symbol: coin.symbol, name: 'Uniswap' };
    } else if (baseAsset === 'aave') {
      keywords['aave'] = { symbol: coin.symbol, name: 'Aave' };
    } else if (baseAsset === 'comp') {
      keywords['compound'] = { symbol: coin.symbol, name: 'Compound' };
    } else if (baseAsset === 'mkr') {
      keywords['maker'] = { symbol: coin.symbol, name: 'Maker' };
    } else if (baseAsset === 'crv') {
      keywords['curve'] = { symbol: coin.symbol, name: 'Curve' };
    } else if (baseAsset === 'yfi') {
      keywords['yearn'] = { symbol: coin.symbol, name: 'Yearn Finance' };
    }
  });
  
  return keywords;
};

/**
 * Clear cache
 */
export const clearCache = () => {
  cache.clear();
  console.log('🗑️ Crypto price cache cleared');
};

export default {
  fetchCryptoPrices,
  fetchAllCryptoSymbols,
  createDynamicCryptoKeywords,
  testAllEndpoints,
  getAvailableSymbols,
  clearCache,
  CRYPTO_SYMBOLS,
  BINANCE_API_ENDPOINTS
};