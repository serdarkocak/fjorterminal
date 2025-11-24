import axios from 'axios';
import CryptoJS from 'crypto-js';

/**
 * Binance Futures API Service
 * Handles authentication and API calls to Binance Futures REST API
 */

const BASE_URL = 'https://fapi.binance.com';

/**
 * Creates a signed query string for Binance API authentication
 * @param {Object} params - Query parameters
 * @param {string} secretKey - Binance API secret key
 * @returns {string} - Signed query string with timestamp and signature
 */
const createSignedQuery = (params = {}, secretKey) => {
  // Add current timestamp in milliseconds
  const timestamp = Date.now();
  const queryParams = {
    ...params,
    timestamp
  };

  // Create query string
  const queryString = Object.keys(queryParams)
    .sort()
    .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  // Create signature using HMAC-SHA256
  const signature = CryptoJS.HmacSHA256(queryString, secretKey).toString();

  // Return final query string with signature
  return `${queryString}&signature=${signature}`;
};

/**
 * Makes an authenticated request to Binance Futures API
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {Object} params - Query parameters
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @returns {Promise<Object>} - API response data
 */
const makeAuthenticatedRequest = async (endpoint, method = 'GET', params = {}, apiKey, secretKey) => {
  try {
    const signedQuery = createSignedQuery(params, secretKey);
    const url = `${BASE_URL}${endpoint}?${signedQuery}`;

    const config = {
      method,
      url,
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    };

    console.log(`🔗 Making ${method} request to: ${endpoint}`);
    const response = await axios(config);
    
    console.log('🔍 Axios response:', response);
    console.log('🔍 Response data:', response.data);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Binance API request failed:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'Invalid API credentials',
        details: 'Please check your API key and secret key'
      };
    } else if (error.response?.status === 403) {
      return {
        success: false,
        error: 'API key permissions insufficient',
        details: 'Please ensure your API key has futures trading permissions'
      };
      } else if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please wait before trying again',
          retryAfter: error.response.headers['retry-after'] || 60
        };
    } else if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timeout',
        details: 'Connection to Binance timed out. Please check your internet connection'
      };
    } else {
      return {
        success: false,
        error: 'Connection failed',
        details: error.response?.data?.msg || error.message || 'Unknown error occurred'
      };
    }
  }
};

/**
 * Tests Binance API connectivity
 * @returns {Promise<Object>} - Connection test result
 */
export const testBinanceConnectivity = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/fapi/v1/ping`, { timeout: 5000 });
    return {
      success: true,
      message: 'Connected to Binance Futures API'
    };
  } catch (error) {
    return {
      success: false,
      error: 'Cannot connect to Binance',
      details: error.message
    };
  }
};

/**
 * Tests API key validity by making a simple authenticated request
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @returns {Promise<Object>} - API key test result
 */
export const testApiKey = async (apiKey, secretKey) => {
  try {
    // First test connectivity
    const connectivityTest = await testBinanceConnectivity();
    if (!connectivityTest.success) {
      return connectivityTest;
    }

    // Test API key with a simple account info request
    const result = await makeAuthenticatedRequest('/fapi/v2/account', 'GET', {}, apiKey, secretKey);
    
    if (result.success) {
      return {
        success: true,
        message: 'API key is valid and has proper permissions'
      };
    } else {
      return result;
    }
  } catch (error) {
    return {
      success: false,
      error: 'API key test failed',
      details: error.message
    };
  }
};

/**
 * Gets futures account information including balances and positions
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @returns {Promise<Object>} - Account information
 */
export const getFuturesAccountInfo = async (apiKey, secretKey) => {
  try {
    const result = await makeAuthenticatedRequest('/fapi/v2/account', 'GET', {}, apiKey, secretKey);
    
    if (!result.success) {
      return {
        connected: false,
        error: result.error,
        details: result.details
      };
    }

    const accountData = result.data;
    
    // Extract relevant balance information
    const totalWalletBalance = parseFloat(accountData.totalWalletBalance || 0);
    const availableBalance = parseFloat(accountData.availableBalance || 0);
    const unrealizedProfit = parseFloat(accountData.totalUnrealizedProfit || 0);

    return {
      connected: true,
      walletBalance: totalWalletBalance.toFixed(2),
      availableBalance: availableBalance.toFixed(2),
      unrealizedProfit: unrealizedProfit.toFixed(2),
      totalMarginBalance: parseFloat(accountData.totalMarginBalance || 0).toFixed(2),
      totalPositionInitialMargin: parseFloat(accountData.totalPositionInitialMargin || 0).toFixed(2),
      totalOpenOrderInitialMargin: parseFloat(accountData.totalOpenOrderInitialMargin || 0).toFixed(2),
      totalCrossWalletBalance: parseFloat(accountData.totalCrossWalletBalance || 0).toFixed(2),
      totalCrossUnPnl: parseFloat(accountData.totalCrossUnPnl || 0).toFixed(2),
      maxWithdrawAmount: parseFloat(accountData.maxWithdrawAmount || 0).toFixed(2),
      canTrade: accountData.canTrade || false,
      canWithdraw: accountData.canWithdraw || false,
      canDeposit: accountData.canDeposit || false,
      updateTime: accountData.updateTime || Date.now(),
      positions: accountData.positions || []
    };
  } catch (error) {
    console.error('❌ Error fetching futures account info:', error);
    return {
      connected: false,
      error: 'Failed to fetch account information',
      details: error.message
    };
  }
};

/**
 * Gets 24hr ticker price statistics for a symbol
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @returns {Promise<Object>} - Price statistics
 */
export const get24hrTicker = async (symbol) => {
  try {
    const response = await axios.get(`${BASE_URL}/fapi/v1/ticker/24hr?symbol=${symbol}`, {
      timeout: 5000
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch price data',
      details: error.response?.data?.msg || error.message
    };
  }
};

/**
 * Gets all open positions
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @returns {Promise<Object>} - Open positions data
 */
export const getOpenPositions = async (apiKey, secretKey) => {
  try {
    const result = await makeAuthenticatedRequest('/fapi/v2/positionRisk', 'GET', {}, apiKey, secretKey);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }

    // Filter out positions with zero size and enhance data
    const activePositions = (result.data || [])
      .filter(position => parseFloat(position.positionAmt) !== 0)
      .map(position => ({
        ...position,
        positionAmt: parseFloat(position.positionAmt),
        entryPrice: parseFloat(position.entryPrice),
        markPrice: parseFloat(position.markPrice),
        unRealizedProfit: parseFloat(position.unRealizedProfit),
        liquidationPrice: parseFloat(position.liquidationPrice),
        leverage: parseFloat(position.leverage),
        isolated: position.isolated === 'true',
        isolatedWallet: parseFloat(position.isolatedWallet || 0),
        marginType: position.isolated === 'true' ? 'Isolated' : 'Cross',
        notional: parseFloat(position.notional),
        percentage: parseFloat(position.entryPrice) > 0 ? 
          ((parseFloat(position.markPrice) - parseFloat(position.entryPrice)) / parseFloat(position.entryPrice) * 100 * (parseFloat(position.positionAmt) > 0 ? 1 : -1)) : 0
      }));

    return {
      success: true,
      positions: activePositions
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch positions',
      details: error.message
    };
  }
};

/**
 * Gets open orders
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @param {string} symbol - Optional symbol filter
 * @returns {Promise<Object>} - Open orders data
 */
export const getOpenOrders = async (apiKey, secretKey, symbol = null) => {
  try {
    const params = symbol ? { symbol } : {};
    const result = await makeAuthenticatedRequest('/fapi/v1/openOrders', 'GET', params, apiKey, secretKey);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }

    return {
      success: true,
      orders: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch open orders',
      details: error.message
    };
  }
};

/**
 * Gets account position mode (One-way or Hedge)
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @returns {Promise<Object>} - Position mode info
 */
export const getPositionMode = async (apiKey, secretKey) => {
  try {
    const result = await makeAuthenticatedRequest('/fapi/v1/positionSide/dual', 'GET', {}, apiKey, secretKey);
    
    if (result.success) {
      return {
        success: true,
        dualSidePosition: result.data.dualSidePosition,
        mode: result.data.dualSidePosition ? 'HEDGE' : 'ONE_WAY'
      };
    } else {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get position mode',
      details: error.message
    };
  }
};

/**
 * Places a futures market order
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param {string} side - Order side ('BUY' or 'SELL')
 * @param {string} quantity - Order quantity
 * @returns {Promise<Object>} - Order result
 */
export const placeFuturesOrder = async (apiKey, secretKey, symbol, side, quantity) => {
  try {
    // First check position mode
    const modeResult = await getPositionMode(apiKey, secretKey);
    if (!modeResult.success) {
      return {
        success: false,
        error: 'Failed to check position mode',
        details: modeResult.details
      };
    }

    // Check if there's an existing position for this symbol
    const positionsResult = await getOpenPositions(apiKey, secretKey);
    const existingPosition = positionsResult.success ? 
      positionsResult.positions.find(p => p.symbol === symbol.toUpperCase() && parseFloat(p.positionAmt) !== 0) : 
      null;

    console.log(`🔍 Existing position for ${symbol}:`, existingPosition);

    // Build params based on position mode
    const params = {
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: 'MARKET',
      quantity: quantity.toString()
    };

    // Only add positionSide if in HEDGE mode
    if (modeResult.mode === 'HEDGE') {
      // For Hedge mode, use the correct positionSide values
      // LONG for BUY orders, SHORT for SELL orders
      const hedgePositionSide = side.toUpperCase() === 'BUY' ? 'LONG' : 'SHORT';
      params.positionSide = hedgePositionSide;
      console.log(`🔀 Hedge mode detected, using positionSide: ${params.positionSide} for ${side.toUpperCase()} order`);
    } else {
      // In One-way mode, don't send positionSide parameter at all
      console.log(`🔀 One-way mode detected, omitting positionSide parameter`);
      // Remove positionSide from params if it exists
      delete params.positionSide;
    }

    // For new positions, ensure we don't send reduceOnly parameter
    // reduceOnly should only be used when closing existing positions
    console.log(`📝 This is a new position order, no reduceOnly parameter needed`);

    console.log(`📋 Final params for order:`, params);
    const result = await makeAuthenticatedRequest('/fapi/v1/order', 'POST', params, apiKey, secretKey);
    
    console.log('🔍 Binance API result:', result);
    console.log('🔍 Result.data:', result.data);
    
    if (result.success) {
      return {
        success: true,
        order: result.data,
        message: `✅ ${side.toUpperCase()} order placed successfully`
      };
    } else {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to place order',
      details: error.message
    };
  }
};

/**
 * Closes a futures position
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param {string} positionSide - Position side ('LONG' or 'SHORT')
 * @returns {Promise<Object>} - Close position result
 */
/**
 * Places a limit order to close a specific amount of position
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param {string} side - Order side ('BUY' or 'SELL')
 * @param {string} quantity - Order quantity
 * @param {string} price - Limit price
 * @returns {Promise<Object>} - Order result
 */
export const placeLimitCloseOrder = async (apiKey, secretKey, symbol, side, quantity, price) => {
  try {
    // Check position mode first
    const modeResult = await getPositionMode(apiKey, secretKey);
    if (!modeResult.success) {
      return {
        success: false,
        error: 'Failed to check position mode',
        details: modeResult.details
      };
    }

    // Build params for limit order
    const params = {
      symbol: symbol.toUpperCase(),
      side: side,
      type: 'LIMIT',
      quantity: quantity,
      price: price,
      timeInForce: 'GTC'
    };

    // Only add positionSide if in HEDGE mode
    if (modeResult.mode === 'HEDGE') {
      // For hedge mode, we need to determine the correct positionSide
      const currentPositionSide = side === 'SELL' ? 'LONG' : 'SHORT';
      params.positionSide = currentPositionSide;
      console.log(`🔀 Hedge mode detected, using positionSide: ${params.positionSide}`);
    } else {
      // In One-way mode, don't send positionSide parameter at all
      console.log(`🔀 One-way mode detected, omitting positionSide parameter`);
      delete params.positionSide;
    }

    console.log(`📋 Final params for limit close order:`, params);
    const result = await makeAuthenticatedRequest('/fapi/v1/order', 'POST', params, apiKey, secretKey);
    
    console.log('🔍 Binance API result:', result);
    console.log('🔍 Result.data:', result.data);
    
    if (result.success) {
      return {
        success: true,
        order: result.data,
        message: `✅ ${side.toUpperCase()} limit order placed successfully`
      };
    } else {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to place limit close order',
      details: error.message
    };
  }
};

export const closeFuturesPosition = async (apiKey, secretKey, symbol) => {
  try {
    // First get current position size
    const positionsResult = await getOpenPositions(apiKey, secretKey);
    if (!positionsResult.success) {
      return positionsResult;
    }

    const position = positionsResult.positions.find(p => 
      p.symbol === symbol.toUpperCase() && 
      parseFloat(p.positionAmt) !== 0
    );

    if (!position) {
      return {
        success: false,
        error: 'No open position found',
        details: `No open position found for ${symbol}`
      };
    }

    const positionAmt = parseFloat(position.positionAmt);
    const closeSide = positionAmt > 0 ? 'SELL' : 'BUY';
    const closeQuantity = Math.abs(positionAmt).toString();

    // Check position mode first
    const modeResult = await getPositionMode(apiKey, secretKey);
    if (!modeResult.success) {
      return {
        success: false,
        error: 'Failed to check position mode',
        details: modeResult.details
      };
    }

    // Build params based on position mode
    const params = {
      symbol: symbol.toUpperCase(),
      side: closeSide,
      type: 'MARKET',
      quantity: closeQuantity
    };

    // Only add positionSide if in HEDGE mode
    if (modeResult.mode === 'HEDGE') {
      // For hedge mode, we need to determine the correct positionSide
      // Since we're closing, we use the current position side
      const currentPositionSide = positionAmt > 0 ? 'LONG' : 'SHORT';
      params.positionSide = currentPositionSide;
      console.log(`🔀 Hedge mode detected, using positionSide: ${params.positionSide}`);
    } else {
      // For one-way mode, add reduceOnly parameter
      params.reduceOnly = 'true';
      console.log(`🔀 One-way mode detected, using reduceOnly`);
    }

    const result = await makeAuthenticatedRequest('/fapi/v1/order', 'POST', params, apiKey, secretKey);
    
    if (result.success) {
      return {
        success: true,
        order: result.data,
        message: `✅ Position closed successfully for ${symbol}`
      };
    } else {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to close position',
      details: error.message
    };
  }
};

/**
 * Gets order history
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @param {string} symbol - Optional symbol filter
 * @param {number} limit - Number of orders to fetch (max 1000)
 * @returns {Promise<Object>} - Order history
 */
export const getOrderHistory = async (apiKey, secretKey, symbol = null, limit = 100) => {
  try {
    const params = {
      limit: Math.min(limit, 1000)
    };
    
    if (symbol) {
      params.symbol = symbol.toUpperCase();
    }

    const result = await makeAuthenticatedRequest('/fapi/v1/allOrders', 'GET', params, apiKey, secretKey);
    
    if (result.success) {
      return {
        success: true,
        orders: result.data
      };
    } else {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch order history',
      details: error.message
    };
  }
};

/**
 * Gets exchange information including symbol filters and precision
 * @returns {Promise<Object>} - Exchange information
 */
export const getExchangeInfo = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/fapi/v1/exchangeInfo`, {
      timeout: 5000
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch exchange info',
      details: error.response?.data?.msg || error.message
    };
  }
};

/**
 * Gets the step size for a symbol to properly format quantity
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @returns {Promise<string>} - Step size for the symbol
 */
export const getSymbolStepSize = async (symbol) => {
  try {
    const result = await getExchangeInfo();
    if (!result.success) {
      return '0.001'; // Default fallback
    }

    const symbolInfo = result.data.symbols.find(s => s.symbol === symbol.toUpperCase());
    if (!symbolInfo) {
      return '0.001'; // Default fallback
    }

    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    if (!lotSizeFilter || !lotSizeFilter.stepSize) {
      return '0.001'; // Default fallback
    }

    return lotSizeFilter.stepSize;
  } catch (error) {
    console.error('Error getting step size:', error);
    return '0.001'; // Default fallback
  }
};

/**
 * Gets the tick size for a symbol to properly format price
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @returns {Promise<Object>} - Tick size result
 */
export const getSymbolTickSize = async (symbol) => {
  try {
    const result = await getExchangeInfo();
    if (!result.success) {
      return {
        success: false,
        error: 'Failed to get exchange info',
        tickSize: '0.01' // Default fallback
      };
    }

    const symbolInfo = result.data.symbols.find(s => s.symbol === symbol.toUpperCase());
    if (!symbolInfo) {
      return {
        success: false,
        error: 'Symbol not found',
        tickSize: '0.01' // Default fallback
      };
    }

    const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
    if (!priceFilter || !priceFilter.tickSize) {
      return {
        success: false,
        error: 'Tick size not found',
        tickSize: '0.01' // Default fallback
      };
    }

    return {
      success: true,
      tickSize: priceFilter.tickSize
    };
  } catch (error) {
    console.error('Error getting tick size:', error);
    return {
      success: false,
      error: error.message,
      tickSize: '0.01' // Default fallback
    };
  }
};

/**
 * Formats quantity according to Binance step size requirements
 * @param {number} quantity - Raw quantity
 * @param {string} stepSize - Step size from exchange info
 * @returns {string} - Properly formatted quantity
 */
export const formatQuantity = (quantity, stepSize) => {
  const step = parseFloat(stepSize);
  if (step >= 1) {
    // For whole numbers (like 1)
    return Math.floor(quantity).toString();
  } else {
    // For decimals, calculate precision
    const precision = stepSize.split('.')[1]?.length || 0;
    const factor = Math.pow(10, precision);
    return (Math.floor(quantity * factor) / factor).toString();
  }
};

/**
 * Formats price according to Binance tick size requirements
 * @param {number} price - Raw price
 * @param {string} tickSize - Tick size from exchange info
 * @returns {string} - Properly formatted price
 */
export const formatPrice = (price, tickSize) => {
  const tick = parseFloat(tickSize);
  if (tick >= 1) {
    // For whole numbers (like 1)
    return Math.floor(price).toString();
  } else {
    // For decimals, calculate precision
    const precision = tickSize.split('.')[1]?.length || 0;
    const factor = Math.pow(10, precision);
    return (Math.floor(price * factor) / factor).toString();
  }
};

/**
 * Sets leverage for a specific symbol
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param {number} leverage - Leverage value (1-125)
 * @returns {Promise<Object>} - Leverage setting result
 */
export const setLeverage = async (apiKey, secretKey, symbol, leverage) => {
  try {
    const params = {
      symbol: symbol.toUpperCase(),
      leverage: leverage
    };

    const result = await makeAuthenticatedRequest('/fapi/v1/leverage', 'POST', params, apiKey, secretKey);
    
    if (result.success) {
      return {
        success: true,
        message: `Leverage set to ${leverage}x for ${symbol}`,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to set leverage',
      details: error.message
    };
  }
};

/**
 * Gets current leverage for a specific symbol
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @returns {Promise<Object>} - Current leverage info
 */
export const getLeverage = async (apiKey, secretKey, symbol) => {
  try {
    const params = {
      symbol: symbol.toUpperCase()
    };

    const result = await makeAuthenticatedRequest('/fapi/v1/leverage', 'GET', params, apiKey, secretKey);
    
    if (result.success) {
      return {
        success: true,
        leverage: result.data.leverage,
        symbol: result.data.symbol
      };
    } else {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get leverage',
      details: error.message
    };
  }
};

export const getOrderStatus = async (apiKey, secretKey, symbol, orderId) => {
  try {
    const params = {
      symbol: symbol,
      orderId: orderId
    };
    
    const result = await makeAuthenticatedRequest('/fapi/v1/order', 'GET', params, apiKey, secretKey);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get order status',
      details: error.message
    };
  }
};

/**
 * Places a stop loss order
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param {string} side - Order side ('BUY' or 'SELL')
 * @param {string} quantity - Order quantity
 * @param {string} stopPrice - Stop price
 * @returns {Promise<Object>} - Order result
 */
export const placeStopLossOrder = async (apiKey, secretKey, symbol, side, quantity, stopPrice) => {
  try {
    // Check position mode first
    const modeResult = await getPositionMode(apiKey, secretKey);
    if (!modeResult.success) {
      return {
        success: false,
        error: 'Failed to check position mode',
        details: modeResult.details
      };
    }

    // Get step size for quantity formatting
    const stepSize = await getSymbolStepSize(symbol);
    const formattedQuantity = formatQuantity(parseFloat(quantity), stepSize);

    // Get tick size for price formatting
    const tickSizeResult = await getSymbolTickSize(symbol);
    const tickSize = tickSizeResult.success ? tickSizeResult.tickSize : '0.01';
    const formattedStopPrice = formatPrice(parseFloat(stopPrice), tickSize);

    console.log(`📏 Stop Loss Formatting - Original: ${quantity}, Formatted: ${formattedQuantity}, Original Price: ${stopPrice}, Formatted: ${formattedStopPrice}`);

    // Build params for stop loss order
    const params = {
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: 'STOP_MARKET',
      quantity: formattedQuantity,
      stopPrice: formattedStopPrice
    };

    // Only add positionSide if in HEDGE mode
    if (modeResult.mode === 'HEDGE') {
      const hedgePositionSide = side.toUpperCase() === 'BUY' ? 'LONG' : 'SHORT';
      params.positionSide = hedgePositionSide;
      console.log(`🔀 Hedge mode detected, using positionSide: ${params.positionSide} for ${side.toUpperCase()} stop loss order`);
    } else {
      console.log(`🔀 One-way mode detected, omitting positionSide parameter for stop loss`);
      delete params.positionSide;
    }

    console.log(`📋 Final params for stop loss order:`, params);
    const result = await makeAuthenticatedRequest('/fapi/v1/order', 'POST', params, apiKey, secretKey);
    
    console.log('🔍 Binance API stop loss result:', result);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        message: 'Stop loss order placed successfully'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to place stop loss order',
        details: result.details
      };
    }
  } catch (error) {
    console.error('Error placing stop loss order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Places a take profit order
 * @param {string} apiKey - Binance API key
 * @param {string} secretKey - Binance API secret key
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param {string} side - Order side ('BUY' or 'SELL')
 * @param {string} quantity - Order quantity
 * @param {string} price - Take profit price
 * @returns {Promise<Object>} - Order result
 */
export const placeTakeProfitOrder = async (apiKey, secretKey, symbol, side, quantity, price) => {
  try {
    // Check position mode first
    const modeResult = await getPositionMode(apiKey, secretKey);
    if (!modeResult.success) {
      return {
        success: false,
        error: 'Failed to check position mode',
        details: modeResult.details
      };
    }

    // Get step size for quantity formatting
    const stepSize = await getSymbolStepSize(symbol);
    const formattedQuantity = formatQuantity(parseFloat(quantity), stepSize);

    // Get tick size for price formatting
    const tickSizeResult = await getSymbolTickSize(symbol);
    const tickSize = tickSizeResult.success ? tickSizeResult.tickSize : '0.01';
    const formattedPrice = formatPrice(parseFloat(price), tickSize);

    console.log(`📏 Take Profit Formatting - Original: ${quantity}, Formatted: ${formattedQuantity}, Original Price: ${price}, Formatted: ${formattedPrice}`);

    // Build params for take profit order
    const params = {
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: 'TAKE_PROFIT_MARKET',
      quantity: formattedQuantity,
      stopPrice: formattedPrice
    };

    // Only add positionSide if in HEDGE mode
    if (modeResult.mode === 'HEDGE') {
      const hedgePositionSide = side.toUpperCase() === 'BUY' ? 'LONG' : 'SHORT';
      params.positionSide = hedgePositionSide;
      console.log(`🔀 Hedge mode detected, using positionSide: ${params.positionSide} for ${side.toUpperCase()} take profit order`);
    } else {
      console.log(`🔀 One-way mode detected, omitting positionSide parameter for take profit`);
      delete params.positionSide;
    }

    console.log(`📋 Final params for take profit order:`, params);
    const result = await makeAuthenticatedRequest('/fapi/v1/order', 'POST', params, apiKey, secretKey);
    
    console.log('🔍 Binance API take profit result:', result);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        message: 'Take profit order placed successfully'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to place take profit order',
        details: result.details
      };
    }
  } catch (error) {
    console.error('Error placing take profit order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  testBinanceConnectivity,
  testApiKey,
  getFuturesAccountInfo,
  get24hrTicker,
  getOpenPositions,
  getOpenOrders,
  placeFuturesOrder,
  placeLimitCloseOrder,
  closeFuturesPosition,
  getOrderHistory,
  getExchangeInfo,
  getSymbolStepSize,
  getSymbolTickSize,
  formatQuantity,
  formatPrice,
  getPositionMode,
  setLeverage,
  getLeverage,
  getOrderStatus,
  placeStopLossOrder,
  placeTakeProfitOrder
};
