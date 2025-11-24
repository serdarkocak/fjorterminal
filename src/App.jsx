import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Header from './components/Header';
import TickerSection from './components/TickerSection';
import NewsFeed from './components/NewsFeed';
import LoginPage from './components/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationSystem, { showSuccess, showError, showWarning, showInfo } from './components/NotificationSystem';
import { PageLoader } from './components/SkeletonLoader';

// Lazy load heavy components
const ChartSection = lazy(() => import('./components/ChartSection'));
const PositionsTable = lazy(() => import('./components/PositionsTable'));
const CommandInput = lazy(() => import('./components/CommandInput'));
import { getFuturesAccountInfo, placeFuturesOrder, closeFuturesPosition, getSymbolStepSize, formatQuantity, setLeverage } from './services/binanceService';
import authService from './services/authService';
import binanceBackendService from './services/binanceBackendService';
import userSettingsService from './services/userSettingsService';
import useSignalR from './hooks/useSignalR';
import logger from './utils/logger'; // Initialize logger on app start

function App() {
  // Initialize logger (makes enableFjorDebug() available in console)
  useEffect(() => {
    logger.info('FJOR Trading Terminal initialized');
  }, []);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Now controlled by backend
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  
  // Shared state for the selected trading symbol
  // This state is shared between NewsFeed (Trade buttons) and TradingViewWidget
  const [selectedSymbol, setSelectedSymbol] = useState('BINANCE:BTCUSDT');
  
  // State for ticker shortcuts from settings
  const [tickerShortcuts, setTickerShortcuts] = useState([]);
  
  // State for position settings
  const [positionSettings, setPositionSettings] = useState({});
  
  // State for leverage settings
  const [leverageSettings, setLeverageSettings] = useState({});
  
  // State for crypto detected coins
  const [cryptoDetectedCoins, setCryptoDetectedCoins] = useState([]);
  
  // State for exchange settings and wallet data
  const [exchangeSettings, setExchangeSettings] = useState({});
  const [walletData, setWalletData] = useState({
    walletBalance: '0.00',
    availableBalance: '0.00',
    unrealizedProfit: '0.00',
    isConnected: false
  });

  // SignalR real-time updates
  const {
    isConnected: signalRConnected,
    connectionState,
    prices: realTimePrices,
    positions: realTimePositions,
    balance: realTimeBalance,
    connect: connectSignalR,
    disconnect: disconnectSignalR
  } = useSignalR({
    autoConnect: false, // Manual connection after auth
    symbols: [] // Will subscribe from components
  });

  // Check authentication on app start
  useEffect(() => {
    const checkAuth = () => {
      // Force reload tokens from localStorage
      authService.loadTokensFromStorage();
      
      const token = authService.getAccessToken();
      const isAuth = authService.isAuthenticated();
      const user = authService.getCurrentUser();
      
      console.log('🔐 Checking authentication on mount:', { 
        isAuth, 
        user,
        hasToken: !!token,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'NO TOKEN'
      });
      
      if (isAuth && token) {
        console.log('✅ User is authenticated with valid token, setting state');
        setIsAuthenticated(true);
        setCurrentUser(user);
        
        // Connect SignalR after authentication
        connectSignalR().catch(err => {
          console.error('❌ SignalR connection failed:', err);
        });
      } else {
        console.log('⏸️ User is not authenticated or missing token');
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    };

    checkAuth();
  }, [connectSignalR]);

  // Auto-refresh token every 50 minutes (before 60 min expiration)
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(async () => {
      console.log('🔄 Auto-refreshing token...');
      const result = await authService.refreshAccessToken();
      
      if (!result.success) {
        console.warn('⚠️ Auto-refresh failed, logging out');
        await handleLogout();
      } else {
        console.log('✅ Token auto-refreshed successfully');
      }
    }, 50 * 60 * 1000); // 50 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);


  // Authentication handlers
  const handleLogin = async (loginData) => {
    setIsLoginLoading(true);
    try {
      console.log('🔐 Login attempt:', loginData.email);
      
      const result = await authService.login(loginData);
      
      if (result.success) {
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        showSuccess('Login Successful', `Welcome, ${result.user.username || result.user.email}!`, null, 4000);
      } else {
        const errorMsg = result.error || 'Login failed';
        showError('Login Error', errorMsg, null, 4000);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMsg = error.message || 'Login failed';
      showError('Login Error', errorMsg, null, 4000);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegister = async (registerData) => {
    setIsLoginLoading(true);
    try {
      console.log('🔐 Register attempt:', registerData.email);
      
      const result = await authService.register(registerData);
      
      if (result.success) {
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        showSuccess('Registration Successful', `Welcome, ${result.user.username || result.user.email}!`, null, 4000);
      } else {
        const errorMsg = result.error || 'Registration failed';
        showError('Registration Error', errorMsg, null, 4000);
      }
    } catch (error) {
      console.error('❌ Register error:', error);
      const errorMsg = error.message || 'Registration failed';
      showError('Registration Error', errorMsg, null, 4000);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🔐 Logout attempt');
      
      // Disconnect SignalR before logout
      await disconnectSignalR();
      
      await authService.logout();
      
      // Clear all user-specific state
      setIsAuthenticated(false);
      setCurrentUser(null);
      setWalletData({
        walletBalance: '0.00',
        availableBalance: '0.00',
        unrealizedProfit: '0.00',
        isConnected: false
      });
      
      // Clear exchange settings
      const emptyExchangeSettings = {
        connected: false,
        apiKey: '',
        secretKey: ''
      };
      setExchangeSettings(emptyExchangeSettings);
      localStorage.removeItem('exchangeSettings');
      
      // Clear user settings (will be reloaded on next login)
      setTickerShortcuts([]);
      setPositionSettings({});
      setLeverageSettings({});
      setCryptoDetectedCoins([]);
      
      showSuccess('Logout Successful', 'See you soon!', null, 3000);
    } catch (error) {
      console.error('❌ Logout error:', error);
      showError('Logout Error', error.message || 'Logout failed', null, 4000);
    }
  };

  // Default values for user settings
  const getDefaultSettings = () => ({
    tickerShortcuts: [
      { baseAsset: 'BTC', priceDecimals: 2 },
      { baseAsset: 'ETH', priceDecimals: 2 },
      { baseAsset: 'SOL', priceDecimals: 2 }
    ],
    positionSettings: {
      'BTC': { sizePresets: ['50', '100', '1000'] },
      'ETH': { sizePresets: ['50', '100', '1000'] },
      'SOL': { sizePresets: ['50', '100', '1000'] }
    },
    leverageSettings: {},
    cryptoDetectedCoins: ['BTC', 'ETH', 'SOL']
  });

  // Load user settings from backend when authenticated
  useEffect(() => {
    const loadUserSettings = async () => {
      // Check token directly instead of relying on state
      const token = authService.getAccessToken();
      if (!token) {
        console.log('⏸️ No token found, skipping settings load');
        return;
      }

      console.log('📥 Loading user settings from backend with token...');
      
      try {
        const result = await userSettingsService.getUserSettings();
        
        if (result.success) {
          const settings = result.settings;
          console.log('✅ User settings loaded:', settings);
          
          const defaults = getDefaultSettings();
          
          // Check if settings are empty (first time user)
          const isFirstTime = settings.tickerShortcuts.length === 0 && 
                              Object.keys(settings.positionSettings).length === 0;
          
          if (isFirstTime) {
            console.log('🆕 First time user - saving default settings to backend');
            // Save defaults to backend
            await userSettingsService.updateUserSettings(defaults);
            // Use defaults
            setTickerShortcuts(defaults.tickerShortcuts);
            setPositionSettings(defaults.positionSettings);
            setLeverageSettings(defaults.leverageSettings);
            setCryptoDetectedCoins(defaults.cryptoDetectedCoins);
          } else {
            // Use existing settings from backend
            setTickerShortcuts(settings.tickerShortcuts.length > 0 ? settings.tickerShortcuts : defaults.tickerShortcuts);
            setPositionSettings(Object.keys(settings.positionSettings).length > 0 ? settings.positionSettings : defaults.positionSettings);
            setLeverageSettings(settings.leverageSettings);
            setCryptoDetectedCoins(settings.cryptoDetectedCoins.length > 0 ? settings.cryptoDetectedCoins : defaults.cryptoDetectedCoins);
          }
        } else {
          console.warn('⚠️ Failed to load user settings, using defaults');
          const defaults = getDefaultSettings();
          setTickerShortcuts(defaults.tickerShortcuts);
          setPositionSettings(defaults.positionSettings);
          setLeverageSettings(defaults.leverageSettings);
          setCryptoDetectedCoins(defaults.cryptoDetectedCoins);
        }
      } catch (error) {
        console.error('❌ Error loading user settings:', error);
        const defaults = getDefaultSettings();
        setTickerShortcuts(defaults.tickerShortcuts);
        setPositionSettings(defaults.positionSettings);
        setLeverageSettings(defaults.leverageSettings);
        setCryptoDetectedCoins(defaults.cryptoDetectedCoins);
      }
    };

    loadUserSettings();
  }, [isAuthenticated]);

  // Load exchange settings - ONLY if authenticated, check backend for API keys
  useEffect(() => {
    // Check token directly
    const token = authService.getAccessToken();
    
    if (token) {
      // Clear any old localStorage settings
      localStorage.removeItem('exchangeSettings');
      
      // Check backend for existing API keys
      checkBackendApiKeys();
    } else {
      // Clear exchange settings when not authenticated
      setExchangeSettings({
        connected: false,
        apiKey: '',
        secretKey: ''
      });
    }
  }, [isAuthenticated]);

  // Check if user has API keys in backend
  const checkBackendApiKeys = async () => {
    try {
      console.log('🔍 Checking backend for API keys...');
      console.log('👤 Current user:', currentUser);
      
      // Wait a bit to ensure token is properly set after login
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await binanceBackendService.getExchangeConnections();
      
      if (result.success && result.connections && result.connections.length > 0) {
        console.log('✅ Found API keys in backend:', result.connections.length);
        console.log('🔑 Connections:', result.connections);
        setExchangeSettings({
          connected: true,
          connectedAt: new Date().toISOString()
        });
      } else if (result.success && (!result.connections || result.connections.length === 0)) {
        console.log('ℹ️ No API keys found in backend');
        setExchangeSettings({
          connected: false
        });
      } else {
        console.warn('⚠️ Failed to get connections:', result.error);
        setExchangeSettings({
          connected: false
        });
      }
    } catch (error) {
      console.error('❌ Error checking backend API keys:', error);
      setExchangeSettings({
        connected: false
      });
    }
  };

  // Fetch wallet data when authenticated and exchange is connected
  useEffect(() => {
    // Check token directly
    const token = authService.getAccessToken();
    const hasConnection = exchangeSettings.connected;
    
    if (token && hasConnection) {
      console.log('🔄 Starting wallet data fetch (token valid and exchange connected)');
      fetchWalletData();
      
      // Set up periodic wallet data updates
      const interval = setInterval(fetchWalletData, 30000); // Update every 30 seconds
      return () => {
        console.log('🛑 Stopping wallet data fetch interval');
        clearInterval(interval);
      };
    } else {
      console.log('⏸️ Wallet data fetch paused', { hasToken: !!token, hasConnection });
      setWalletData({
        walletBalance: '0.00',
        availableBalance: '0.00',
        unrealizedProfit: '0.00',
        isConnected: false
      });
    }
  }, [isAuthenticated, exchangeSettings.connected]);

  // Handle trade button clicks from NewsFeed (CoinBar)
  const handleTradeClick = (symbol, action, amount) => {
    console.log('Trade button clicked:', { symbol, action, amount });
    
    // Convert symbol to BINANCE format if needed
    const binanceSymbol = symbol.startsWith('BINANCE:') ? symbol : `BINANCE:${symbol}`;
    console.log('Setting chart symbol to:', binanceSymbol);
    setSelectedSymbol(binanceSymbol);
    
    // If we have action and amount, execute the trade
    if (action && amount) {
      // Convert amount to number (CoinBar sends string)
      const usdAmount = parseFloat(amount);
      const side = action.toLowerCase(); // 'buy' or 'sell'
      
      // Determine positionSide for Hedge Mode
      const positionSide = side === 'buy' ? 'LONG' : 'SHORT';
      
      // Create trade data object
      const tradeData = {
        symbol: symbol,
        side: side.toUpperCase(), // Backend expects uppercase
        type: 'MARKET',
        quantity: usdAmount, // This will be converted to coin quantity in handleTradeExecute
        usdAmount: usdAmount,
        positionSide: positionSide
      };
      
      console.log('Executing trade from CoinBar:', tradeData);
      handleTradeExecute(tradeData);
    }
  };

  // Handle ticker shortcuts changes from settings
  const handleTickerShortcutsChange = async (newShortcuts) => {
    console.log('🔄 Ticker shortcuts updated in App:', newShortcuts);
    setTickerShortcuts(newShortcuts);
    
    // Save to backend
    if (isAuthenticated) {
      await userSettingsService.updateUserSettings({ tickerShortcuts: newShortcuts });
    }
  };

  // Handle position settings changes from settings
  const handlePositionSettingsChange = async (newSettings) => {
    console.log('🔄 Position settings updated in App:', newSettings);
    setPositionSettings(newSettings);
    
    // Save to backend
    if (isAuthenticated) {
      await userSettingsService.updateUserSettings({ positionSettings: newSettings });
    }
  };

  // Handle leverage settings changes from settings
  const handleLeverageSettingsChange = async (newSettings) => {
    console.log('🔄 Leverage settings updated in App:', newSettings);
    setLeverageSettings(newSettings);
    
    // Save to backend
    if (isAuthenticated) {
      await userSettingsService.updateUserSettings({ leverageSettings: newSettings });
    }
  };

  // Handle crypto detected coins changes from settings
  const handleCryptoDetectedCoinsChange = async (newCoins) => {
    console.log('🔄 Crypto detected coins updated in App:', newCoins);
    setCryptoDetectedCoins(newCoins);
    
    // Save to backend
    if (isAuthenticated) {
      await userSettingsService.updateUserSettings({ cryptoDetectedCoins: newCoins });
    }
  };

  // Handle exchange settings changes from settings
  const handleExchangeSettingsChange = (newSettings) => {
    console.log('🔄 Exchange settings updated in App:', newSettings);
    setExchangeSettings(newSettings);
    
    // If disconnected, reset wallet data
    if (!newSettings.connected) {
      console.log('🔌 Disconnected - resetting wallet data');
      setWalletData({
        walletBalance: '0.00',
        availableBalance: '0.00',
        unrealizedProfit: '0.00',
        isConnected: false
      });
    } else {
      setWalletData(prev => ({
        ...prev,
        isConnected: true
      }));
    }
  };

  // Fetch wallet data from Backend (Binance Futures API)
  const fetchWalletData = async () => {
    if (!isAuthenticated) {
      console.log('⏸️ Skipping wallet data fetch - not authenticated');
      return;
    }

    try {
      console.log('💰 Fetching wallet data from backend...');
      console.log('🔑 Current user:', currentUser);
      console.log('🔑 Access token exists:', !!authService.getAccessToken());
      
      const accountInfo = await binanceBackendService.getFuturesAccountInfo();

      if (accountInfo.success && accountInfo.connected) {
        setWalletData({
          walletBalance: accountInfo.walletBalance,
          availableBalance: accountInfo.availableBalance,
          unrealizedProfit: accountInfo.unrealizedProfit,
          isConnected: true,
          lastUpdated: new Date().toISOString()
        });

        console.log('✅ Wallet data updated:', {
          walletBalance: accountInfo.walletBalance,
          availableBalance: accountInfo.availableBalance,
          unrealizedProfit: accountInfo.unrealizedProfit
        });
      } else if (accountInfo.success && !accountInfo.connected) {
        console.log('ℹ️ No API keys found:', accountInfo.message);
        setWalletData({
          walletBalance: '0.00',
          availableBalance: '0.00',
          unrealizedProfit: '0.00',
          isConnected: false
        });
      } else {
        console.error('❌ Failed to fetch wallet data:', accountInfo.error);
        setWalletData(prev => ({
          ...prev,
          isConnected: false,
          lastError: accountInfo.error
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching wallet data:', error);
      setWalletData(prev => ({
        ...prev,
        isConnected: false,
        lastError: error.message
      }));
    }
  };

  // Handle trade execution with real Binance Futures API
  // Handle symbol selection from TickerSection (for TradingView widget)
  const handleSymbolSelect = (symbol) => {
    console.log('🔄 Symbol selected:', symbol);
    setSelectedSymbol(symbol);
  };

  const handleTradeExecute = async (tradeData) => {
    console.log('📍 handleTradeExecute called with:', tradeData);
    console.log('🔑 Current exchangeSettings:', {
      connected: exchangeSettings.connected,
      hasApiKey: !!exchangeSettings.apiKey,
      hasSecretKey: !!exchangeSettings.secretKey,
      apiKeyLength: exchangeSettings.apiKey?.length || 0,
      secretKeyLength: exchangeSettings.secretKey?.length || 0
    });

    if (!exchangeSettings.connected) {
      showError(
        'Connection Required',
        'Please connect to Binance first',
        null,
        3000
      );
      return;
    }

    // Show trade notification
    const amountText = tradeData.usdAmount 
      ? `$${tradeData.usdAmount} USD` 
      : `${tradeData.quantity} ${tradeData.symbol.replace('USDT', '')}`;
      
    showInfo(
      'Placing Order',
      `Executing ${tradeData.side.toUpperCase()} ${tradeData.type} order`,
      {
        Symbol: tradeData.symbol,
        Amount: amountText,
        Side: tradeData.side.toUpperCase(),
        Type: tradeData.type.toUpperCase()
      },
      3000
    );

    try {
      console.log('🚀 Executing futures trade:', tradeData);
      
      // Set leverage before placing order (via backend)
      const symbolLeverage = leverageSettings[tradeData.symbol] || leverageSettings['default'] || 1;
      
      if (symbolLeverage > 1) {
        console.log(`🔧 Setting leverage to ${symbolLeverage}x for ${tradeData.symbol}`);
        const leverageResult = await binanceBackendService.setLeverage(
          tradeData.symbol,
          symbolLeverage
        );
        
        if (leverageResult.success) {
          console.log(`✅ Leverage set to ${symbolLeverage}x`);
        } else {
          console.warn(`⚠️ Failed to set leverage: ${leverageResult.error}`);
        }
      }
      
      // Get current price and calculate coin quantity from USD amount
      let coinQuantity = parseFloat(tradeData.quantity);
      
      // If we have usdAmount, calculate coin quantity from USD
      if (tradeData.usdAmount) {
        try {
          // Fetch current price from Binance
          const priceResponse = await fetch(`/api/binance/ticker/24hr?symbol=${tradeData.symbol}`);
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            const currentPrice = parseFloat(priceData.lastPrice);
            coinQuantity = tradeData.usdAmount / currentPrice;
            console.log(`💰 USD Amount: $${tradeData.usdAmount}, Price: $${currentPrice}, Coin Quantity: ${coinQuantity}`);
          }
        } catch (error) {
          console.warn('Failed to fetch current price, using quantity as coin amount:', error);
        }
      }
      
      // Get the correct step size for this symbol and format quantity
      const stepSize = await getSymbolStepSize(tradeData.symbol);
      const formattedQuantity = formatQuantity(coinQuantity, stepSize);
      
      console.log(`📏 Symbol: ${tradeData.symbol}, Step Size: ${stepSize}, Original: ${coinQuantity}, Formatted: ${formattedQuantity}`);
      
      // Place order via backend (no API keys needed in frontend!)
      const result = await binanceBackendService.placeOrder({
        symbol: tradeData.symbol,
        side: tradeData.side,
        type: tradeData.type || 'MARKET',
        quantity: formattedQuantity,
        positionSide: tradeData.positionSide
      });

      console.log('🔍 Place order result:', result);
      console.log('🔍 Result success:', result.success);
      console.log('🔍 Result order:', result.order);

      if (result.success) {
        console.log('✅ Trade executed successfully:', result.order);
        
        if (result.order) {
          console.log('📊 Full order response:', JSON.stringify(result.order, null, 2));
        } else {
          console.log('⚠️ Result.order is undefined or null');
        }
        console.log('📊 Order details:', {
          executedQty: result.order?.executedQty,
          avgPrice: result.order?.avgPrice,
          origQty: result.order?.origQty,
          price: result.order?.price,
          orderId: result.order?.orderId,
          status: result.order?.status,
          cumQuote: result.order?.cumQuote,
          cumQty: result.order?.cumQty
        });
        
        // Get order details safely with more fallbacks
        const order = result.order || {};
        const orderId = order.orderId || 'N/A';
        const status = order.status || 'NEW';

        console.log('🎯 Order status:', status);

        // Market orders execute immediately, just show success notification
        // Backend sends: executedQuantity (PascalCase) → executedQuantity (camelCase)
        const executedQty = order.executedQuantity || order.quantity || formattedQuantity;
        const avgPrice = order.price || 'Market';
        
        console.log('✅ Order executed:', { 
          orderId, 
          status, 
          executedQty, 
          avgPrice,
          rawOrder: order 
        });
        
        showSuccess(
          'Order Placed',
          `${tradeData.symbol} ${tradeData.side.toUpperCase()}`,
          {
            'Quantity': `${executedQty} @ ${avgPrice} USDT`,
            'Order ID': orderId,
            'Status': status
          },
          5000
        );
        
        // OLD CODE - REMOVED (was using frontend binanceService with API keys)
        /*
        // If order is NEW, wait a bit and check again
        if (status === 'NEW') {
          console.log('⏳ Order is NEW, waiting for execution...');
          
          // Wait 2 seconds and check order status
          setTimeout(async () => {
            try {
              const { getOrderStatus } = await import('./services/binanceService');
              const orderStatus = await getOrderStatus(
                exchangeSettings.apiKey,
                exchangeSettings.secretKey,
                tradeData.symbol,
                orderId
              );
              
              // OLD CODE - commented out
            } catch (error) {
              // OLD CODE - commented out
            }
          }, 2000);
        } else {
          // OLD CODE - commented out
        }
        */
        
        // Refresh wallet data after trade
        setTimeout(() => {
          fetchWalletData();
        }, 1000);
      } else {
        console.error('❌ Trade execution failed:', result.error);
        console.error('❌ Full error result:', result);
        
        showError(
          'Trade Failed',
          result.error,
          {
            'Details': result.details || 'Unknown error',
            'Symbol': tradeData.symbol,
            'Side': tradeData.side.toUpperCase()
          },
          8000
        );
      }

    } catch (error) {
      console.error('❌ Trade execution failed:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Trade data:', tradeData);
      
      showError(
        'Trade Execution Failed',
        error.message,
        {
          'Symbol': tradeData.symbol,
          'Side': tradeData.side.toUpperCase(),
          'Type': tradeData.type.toUpperCase()
        },
        8000
      );
    }
  };

  return (
    <ErrorBoundary name="Application Root">
      {/* Notification System - Always render */}
      <NotificationSystem />
      
      {/* Show login page if not authenticated */}
      {!isAuthenticated ? (
        <LoginPage 
          onLogin={handleLogin}
          onRegister={handleRegister}
          isLoading={isLoginLoading}
        />
      ) : (
        <div className="bg-[#0f0f0f] text-gray-300 font-sans select-none min-h-screen">
      
      {/* Header with logo, balances, and user info */}
      <Header 
        onTickerShortcutsChange={handleTickerShortcutsChange}
        onPositionSettingsChange={handlePositionSettingsChange}
        onLeverageSettingsChange={handleLeverageSettingsChange}
        onExchangeSettingsChange={handleExchangeSettingsChange}
        onCryptoDetectedCoinsChange={handleCryptoDetectedCoinsChange}
        tickerShortcuts={tickerShortcuts}
        positionSettings={positionSettings}
        leverageSettings={leverageSettings}
        exchangeSettings={exchangeSettings}
        cryptoDetectedCoins={cryptoDetectedCoins}
        walletData={walletData}
        currentUser={currentUser}
        onLogout={handleLogout}
        signalRConnected={signalRConnected}
        signalRConnectionState={connectionState}
        realTimePrices={realTimePrices}
      />
      
      {/* Ticker section with crypto prices */}
      <TickerSection 
        tickerShortcuts={tickerShortcuts}
        positionSettings={positionSettings}
        exchangeSettings={exchangeSettings}
        onTradeExecute={handleTradeExecute}
        onSymbolSelect={handleSymbolSelect}
        walletData={walletData}
      />
      
      
      {/* Main content area */}
      <main className="flex-1 min-h-[800px] p-2">
        <div className="flex h-full gap-4">
          {/* Left side: News & Tweets */}
          <div className="w-1/3 min-w-[300px]">
            <NewsFeed onTradeClick={handleTradeClick} onSymbolClick={handleSymbolSelect} cryptoDetectedCoins={cryptoDetectedCoins} />
          </div>
          
          {/* Right side: Command input and TradingView chart */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Command input */}
            <div className="h-[150px] flex-shrink-0">
              <Suspense fallback={<div className="h-full bg-[#0a0a0a] flex items-center justify-center text-gray-500">Loading command input...</div>}>
                <CommandInput onTradeExecute={handleTradeExecute} />
              </Suspense>
            </div>
            
            {/* TradingView chart container - RESIZABLE */}
            <div className="flex-1 min-h-[500px]">
              <ErrorBoundary>
                <Suspense fallback={<PageLoader message="Loading chart..." />}>
                  <ChartSection selectedSymbol={selectedSymbol} />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </main>
      
      {/* Bottom positions and open orders table */}
      <div className="p-2">
        <div className="h-[300px]">
          <Suspense fallback={<div className="h-full bg-[#0a0a0a] flex items-center justify-center text-gray-500">Loading positions...</div>}>
            <PositionsTable 
              exchangeSettings={exchangeSettings}
              onSymbolClick={handleSymbolSelect}
            />
          </Suspense>
        </div>
      </div>
      </div>
      )}
    </ErrorBoundary>
  );
}

export default App;
