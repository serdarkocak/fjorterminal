// Binance Backend Service for FjorTerminal
// Handles all Binance-related API calls through the backend

import authService from './authService';
import logger from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1';

class BinanceBackendService {
  constructor() {
    this.authService = authService;
  }

  // Get authorization headers with automatic token refresh
  async getAuthHeaders() {
    // Check if user is authenticated
    const token = this.authService.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Add API key (Exchange connection)
  async addApiKey(apiKey, apiSecret) {
    try {
      console.log('🔑 Adding API key to backend');
      console.log('📊 API Key length:', apiKey?.length || 0);
      console.log('📊 Secret Key length:', apiSecret?.length || 0);
      
      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret Key are required');
      }

      const headers = await this.getAuthHeaders();
      const payload = {
        apiKey: apiKey,
        apiSecret: apiSecret,
        exchangeName: 'Binance'
      };
      
      console.log('📤 Sending payload:', { 
        apiKey: apiKey.substring(0, 10) + '...', 
        apiSecret: apiSecret.substring(0, 10) + '...',
        exchangeName: 'Binance'
      });
      
      const response = await fetch(`${API_BASE_URL}/exchanges`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to add API key');
      }

      console.log('✅ API key added successfully:', data);

      return {
        success: true,
        message: 'API key added successfully',
        data: data.data
      };
    } catch (error) {
      console.error('❌ Add API key error:', error);
      return {
        success: false,
        error: error.message || 'Failed to add API key'
      };
    }
  }

  // Remove API key (Exchange connection)
  async removeApiKey(connectionId) {
    try {
      console.log('🗑️ Removing API key from backend:', connectionId);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/exchanges/${connectionId}`, {
        method: 'DELETE',
        headers: headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to remove API key');
      }

      console.log('✅ API key removed successfully');

      return {
        success: true,
        message: 'API key removed successfully'
      };
    } catch (error) {
      console.error('❌ Remove API key error:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove API key'
      };
    }
  }

  // Get exchange connections (API keys)
  async getExchangeConnections() {
    try {
      logger.debug('Fetching exchange connections');

      const headers = await this.getAuthHeaders();
      // SECURITY: Never log authorization tokens, even partially
      logger.debug('Request authenticated', { hasToken: !!headers.Authorization });
      
      const response = await fetch(`${API_BASE_URL}/exchanges`, {
        method: 'GET',
        headers: headers
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        console.error('❌ Exchange connections request failed:', response.status, response.statusText);
        
        // If 401, token expired - clear and force re-login
        if (response.status === 401) {
          console.warn('⚠️ 401 Unauthorized - Token expired, clearing auth');
          this.authService.clearTokens();
          window.location.reload();
          return { success: false, error: 'Session expired', connections: [] };
        }
        
        // Try to parse error message
        let errorMessage = 'Failed to get connections';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            const textError = await response.text();
            console.error('❌ Non-JSON response:', textError);
          }
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      // Parse success response
      const data = await response.json();
      console.log('✅ Exchange connections retrieved successfully');
      console.log('📊 Raw response data:', data);
      console.log('📊 Connections count:', (data.data || []).length);
      console.log('🔍 Connection details:', data.data);

      return {
        success: true,
        connections: data.data || []
      };
    } catch (error) {
      console.error('❌ Get connections error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get connections',
        connections: []
      };
    }
  }

  // Get Binance Futures account info
  async getFuturesAccountInfo() {
    try {
      // First check if user has any API keys
      const connectionsResponse = await this.getExchangeConnections();
      
      if (!connectionsResponse.success) {
        throw new Error(connectionsResponse.error || 'Failed to get connections');
      }

      const connections = connectionsResponse.connections || [];
      
      if (connections.length === 0) {
        return { 
          success: true, 
          connected: false, 
          message: 'No API keys found. Please add your Binance API key in Settings.' 
        };
      }

      // Get account info from backend
      try {
        logger.debug('Attempting to fetch account info from backend');
        logger.debug('API URL', `${API_BASE_URL}/exchanges/account`);
        
        const headers = await this.getAuthHeaders();
        // SECURITY: Never log authorization headers in production
        logger.debug('Request authenticated', { hasToken: !!headers.Authorization });
        
        const response = await fetch(`${API_BASE_URL}/exchanges/account`, {
          method: 'GET',
          headers: headers
        });

        console.log('📡 Account endpoint response status:', response.status);
        console.log('📡 Account endpoint response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('📊 Account endpoint response data:', data);

        if (response.ok && data.success && data.data) {
          const accountData = data.data;
          
          console.log('📊 Real account data received:', accountData);
          console.log('💰 totalWalletBalance (raw):', accountData.totalWalletBalance);
          console.log('💰 availableBalance (raw):', accountData.availableBalance);
          console.log('💰 totalUnrealizedProfit (raw):', accountData.totalUnrealizedProfit);
          
          // Binance returns values as integers (multiply by 10^8), so we need to parse as decimal
          // If the value looks like an integer (no decimal point), it's likely in the 8-decimal format
          const parseBalance = (value) => {
            if (!value) return 0;
            const numValue = parseFloat(value);
            // If it's already a proper decimal (< 1000 and has decimals), use it as is
            // Otherwise it's likely an integer representation, so divide by 100000000
            if (numValue < 1000 && value.toString().includes('.')) {
              return numValue;
            }
            // It's in integer format (8 decimals), convert it
            return numValue / 100000000;
          };
          
          const walletBalance = parseBalance(accountData.totalWalletBalance);
          const availableBalance = parseBalance(accountData.availableBalance);
          const unrealizedProfit = parseBalance(accountData.totalUnrealizedProfit);
          
          console.log('💰 Parsed values (corrected):', { walletBalance, availableBalance, unrealizedProfit });
          
          return {
            success: true,
            connected: true,
            message: 'Account info retrieved successfully',
            walletBalance: walletBalance.toFixed(2),
            availableBalance: availableBalance.toFixed(2),
            unrealizedProfit: unrealizedProfit.toFixed(2),
            connectionCount: connections.length
          };
        } else {
          console.warn('Account endpoint failed:', data);
          throw new Error(data.message || 'Account endpoint failed');
        }
      } catch (accountError) {
        console.error('Account endpoint failed:', accountError);
        throw accountError;
      }
    } catch (error) {
      console.error('Account info error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to get account info'
      };
    }
  }

  // Get ticker price for a symbol
  async getTickerPrice(symbol) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/exchanges/ticker/${symbol}`, {
        method: 'GET',
        headers: headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get ticker price');
      }

      return {
        success: true,
        price: data.data.price,
        symbol: data.data.symbol
      };
    } catch (error) {
      console.error('❌ Get ticker price error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticker price'
      };
    }
  }

  // Place order
  async placeOrder(orderData) {
    try {
      console.log('📝 Placing order:', orderData);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/trading/orders`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to place order');
      }

      console.log('✅ Order placed successfully:', data);

      return {
        success: true,
        order: data.data
      };
    } catch (error) {
      console.error('❌ Place order error:', error);
      return {
        success: false,
        error: error.message || 'Failed to place order'
      };
    }
  }

  // Get open orders
  async getOpenOrders(symbol = null) {
    try {
      const headers = await this.getAuthHeaders();
      const url = symbol 
        ? `${API_BASE_URL}/trading/orders?symbol=${encodeURIComponent(symbol)}`
        : `${API_BASE_URL}/trading/orders`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log('📡 Get open orders response status:', response.status);
      const data = await response.json();
      console.log('📥 Get open orders raw response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get open orders');
      }

      if (data.success && data.data) {
        // Filter only open orders (status: NEW, PARTIALLY_FILLED)
        const openOrders = data.data.filter(order => {
          const status = order.status || order.Status || '';
          return status === 'NEW' || status === 'PARTIALLY_FILLED';
        });
        
        return {
          success: true,
          orders: openOrders
        };
      } else {
        return {
          success: false,
          orders: [],
          error: data.message || 'Failed to get open orders'
        };
      }
    } catch (error) {
      console.error('❌ Get open orders error:', error);
      return {
        success: false,
        orders: [],
        error: error.message || 'Failed to get open orders'
      };
    }
  }

  // Cancel order
  async cancelOrder(symbol, orderId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/trading/orders/${encodeURIComponent(symbol)}/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        headers: headers
      });

      console.log('📡 Cancel order response status:', response.status);
      const data = await response.json();
      console.log('📥 Cancel order response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel order');
      }

      return {
        success: true,
        message: data.message || 'Order cancelled successfully'
      };
    } catch (error) {
      console.error('❌ Cancel order error:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel order'
      };
    }
  }

  // Get positions
  async getPositions() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/trading/positions`, {
        method: 'GET',
        headers: headers
      });

      console.log('📡 Get positions response status:', response.status);
      console.log('📡 Get positions response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('📥 Get positions raw response:', JSON.stringify(data, null, 2));
      console.log('📊 Response success:', data.success);
      console.log('📊 Response has data:', !!data.data);
      console.log('📊 Response data type:', typeof data.data);
      console.log('📊 Response data is array:', Array.isArray(data.data));
      if (data.data) {
        console.log('📊 Response data length:', data.data.length);
        if (data.data.length > 0) {
          console.log('📊 First position in response:', JSON.stringify(data.data[0], null, 2));
          console.log('📊 First position keys:', Object.keys(data.data[0]));
        }
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get positions');
      }

      return {
        success: true,
        positions: data.data || []
      };
    } catch (error) {
      console.error('❌ Get positions error:', error);
      console.error('❌ Error stack:', error.stack);
      return {
        success: false,
        error: error.message || 'Failed to get positions',
        positions: []
      };
    }
  }

  // Close position
  async closePosition(symbol, quantity = null) {
    try {
      console.log('📝 Closing position:', symbol, quantity ? `quantity: ${quantity}` : 'close all');

      const headers = await this.getAuthHeaders();
      const requestBody = {
        symbol: symbol
      };
      
      // If quantity is provided, include it; otherwise null means close all
      if (quantity !== null) {
        requestBody.quantity = quantity;
      }
      
      console.log('📤 Close position request:', requestBody);

      const response = await fetch(`${API_BASE_URL}/trading/positions/close`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to close position');
      }

      console.log('✅ Position closed successfully:', data);

      return {
        success: true,
        result: data.data
      };
    } catch (error) {
      console.error('❌ Close position error:', error);
      return {
        success: false,
        error: error.message || 'Failed to close position'
      };
    }
  }

  // Place limit order to close position
  async placeLimitOrder(symbol, side, quantity, price, positionSide = null) {
    try {
      console.log('📝 Placing limit order:', { symbol, side, quantity, price, positionSide });

      const headers = await this.getAuthHeaders();
      const requestBody = {
        symbol: symbol,
        side: side,
        quantity: parseFloat(quantity),
        price: parseFloat(price)
      };
      
      // Add positionSide if provided (for Hedge mode)
      if (positionSide) {
        requestBody.positionSide = positionSide;
      }
      
      console.log('📤 Limit order request:', requestBody);

      const response = await fetch(`${API_BASE_URL}/trading/orders/limit`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      // If 401, token expired - clear and force re-login
      if (response.status === 401) {
        console.warn('⚠️ 401 Unauthorized - Token expired, clearing auth');
        this.authService.clearTokens();
        window.location.reload();
        return { success: false, error: 'Session expired' };
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to place limit order');
      }

      console.log('✅ Limit order placed successfully:', data);

      return {
        success: true,
        order: data.data
      };
    } catch (error) {
      console.error('❌ Place limit order error:', error);
      return {
        success: false,
        error: error.message || 'Failed to place limit order'
      };
    }
  }

  // Place order
  async placeOrder(orderData) {
    try {
      console.log('📍 Placing order via backend:', orderData);
      const headers = await this.getAuthHeaders();
      
      const requestBody = {
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type || 'MARKET',
        quantity: orderData.quantity,
        positionSide: orderData.positionSide
      };
      
      logger.debug('Placing order', requestBody);
      // SECURITY: Never log authorization headers
      logger.debug('Request authenticated', { hasToken: !!headers.Authorization });
      
      const response = await fetch(`${API_BASE_URL}/exchanges/orders`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      // If 401, token expired - clear and force re-login
      if (response.status === 401) {
        console.warn('⚠️ 401 Unauthorized - Token expired, clearing auth');
        authService.clearTokens();
        window.location.reload();
        return { success: false, error: 'Session expired' };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to place order');
      }

      const data = await response.json();
      console.log('✅ Order placed successfully:', data);
      return {
        success: true,
        order: data
      };
    } catch (error) {
      console.error('❌ Place order error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Set leverage
  async setLeverage(symbol, leverage) {
    try {
      console.log(`📍 Setting leverage for ${symbol} to ${leverage}x`);
      const headers = await this.getAuthHeaders();
      
      const requestBody = {
        symbol: symbol,
        leverage: leverage
      };
      
      console.log('📤 Leverage request body:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/exchanges/leverage`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      // If 401, token expired - clear and force re-login
      if (response.status === 401) {
        console.warn('⚠️ 401 Unauthorized - Token expired, clearing auth');
        authService.clearTokens();
        window.location.reload();
        return { success: false, error: 'Session expired' };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to set leverage');
      }

      const data = await response.json();
      console.log('✅ Leverage set successfully:', data);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Set leverage error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const binanceBackendService = new BinanceBackendService();

export default binanceBackendService;

