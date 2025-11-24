import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings, Search, Check, AlertCircle } from 'lucide-react';
import { fetchAllCryptoSymbols } from '../services/cryptoApi';
import binanceBackendService from '../services/binanceBackendService';
import authService from '../services/authService';

const SettingsModal = ({ isOpen, onClose, onTickerShortcutsChange, tickerShortcuts = [], positionSettings = {}, onPositionSettingsChange, leverageSettings = {}, onLeverageSettingsChange, exchangeSettings = {}, onExchangeSettingsChange, cryptoDetectedCoins = [], onCryptoDetectedCoinsChange }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [localTickerShortcuts, setLocalTickerShortcuts] = useState([]);
  const [availableCoins, setAvailableCoins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  // Position settings state
  const [localPositionSettings, setLocalPositionSettings] = useState({});
  
  // Leverage settings state
  const [localLeverageSettings, setLocalLeverageSettings] = useState({});
  const [updateAllLeverage, setUpdateAllLeverage] = useState('');
  const [isUpdatingLeverage, setIsUpdatingLeverage] = useState(false);
  
  // Exchange settings state
  const [localExchangeSettings, setLocalExchangeSettings] = useState({});
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [exchangeConnections, setExchangeConnections] = useState([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  
  // Crypto detected coins state
  const [localCryptoDetectedCoins, setLocalCryptoDetectedCoins] = useState([]);

  // Load ticker shortcuts from props (not localStorage - comes from backend now)
  useEffect(() => {
    console.log('📥 SettingsModal: Loading ticker shortcuts from props:', tickerShortcuts);
    setLocalTickerShortcuts(tickerShortcuts || []);
  }, [tickerShortcuts]);

  // Load position settings from props (not localStorage - comes from backend now)
  useEffect(() => {
    console.log('📥 SettingsModal: Loading position settings from props:', positionSettings);
    setLocalPositionSettings(positionSettings || {});
  }, [positionSettings]);

  // Load leverage settings from props (not localStorage - comes from backend now)
  useEffect(() => {
    console.log('📥 SettingsModal: Loading leverage settings from props:', leverageSettings);
    setLocalLeverageSettings(leverageSettings || {});
  }, [leverageSettings]);

  // Load exchange settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('exchangeSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setLocalExchangeSettings(settings);
        setApiKey(settings.apiKey || '');
        setSecretKey(settings.secretKey || '');
      } catch (error) {
        console.error('Error loading exchange settings:', error);
        setLocalExchangeSettings({});
      }
    } else {
      setLocalExchangeSettings(exchangeSettings);
    }
  }, [exchangeSettings]);

  // Load crypto detected coins from props (not localStorage - comes from backend now)
  useEffect(() => {
    console.log('📥 SettingsModal: Loading crypto detected coins from props:', cryptoDetectedCoins);
    setLocalCryptoDetectedCoins(cryptoDetectedCoins || []);
  }, [cryptoDetectedCoins]);

  // Load available coins from Binance
  useEffect(() => {
    if (isOpen && availableCoins.length === 0) {
      loadAvailableCoins();
    }
  }, [isOpen]);

  // Load exchange connections when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'exchange') {
      loadExchangeConnections();
    }
  }, [isOpen, activeTab]);

  const loadExchangeConnections = async () => {
    try {
      setIsLoadingConnections(true);
      
      // Check if user is authenticated before making API call
      if (!authService.isAuthenticated()) {
        console.warn('⚠️ Not authenticated, skipping exchange connections load');
        setExchangeConnections([]);
        setIsLoadingConnections(false);
        return;
      }
      
      const result = await binanceBackendService.getExchangeConnections();
      
      if (result.success) {
        setExchangeConnections(result.connections || []);
        
        // Update connection status based on backend data
        const isConnected = (result.connections || []).length > 0;
        setLocalExchangeSettings({
          connected: isConnected
        });
        
        console.log('✅ Loaded exchange connections:', result.connections);
      } else {
        console.error('❌ Failed to load connections:', result.error);
        setExchangeConnections([]);
      }
    } catch (error) {
      console.error('❌ Error loading connections:', error);
      setExchangeConnections([]);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const loadAvailableCoins = async () => {
    try {
      setIsLoadingCoins(true);
      const allSymbols = await fetchAllCryptoSymbols();
      
      // Filter and format coins for display
      const formattedCoins = allSymbols
        .filter(coin => coin.baseAsset.length >= 2 && coin.baseAsset.length <= 6)
        .map(coin => ({
          symbol: coin.symbol,
          baseAsset: coin.baseAsset,
          name: coin.baseAsset,
          displayName: `${coin.baseAsset} (${coin.symbol})`
        }))
        .sort((a, b) => a.baseAsset.localeCompare(b.baseAsset));
      
      setAvailableCoins(formattedCoins);
    } catch (error) {
      console.error('Error loading available coins:', error);
      // Fallback to major coins
      const fallbackCoins = [
        { symbol: 'BTCUSDT', baseAsset: 'BTC', name: 'Bitcoin', displayName: 'BTC (BTCUSDT)' },
        { symbol: 'ETHUSDT', baseAsset: 'ETH', name: 'Ethereum', displayName: 'ETH (ETHUSDT)' },
        { symbol: 'XRPUSDT', baseAsset: 'XRP', name: 'Ripple', displayName: 'XRP (XRPUSDT)' },
        { symbol: 'ADAUSDT', baseAsset: 'ADA', name: 'Cardano', displayName: 'ADA (ADAUSDT)' },
        { symbol: 'SOLUSDT', baseAsset: 'SOL', name: 'Solana', displayName: 'SOL (SOLUSDT)' },
        { symbol: 'DOTUSDT', baseAsset: 'DOT', name: 'Polkadot', displayName: 'DOT (DOTUSDT)' },
        { symbol: 'LINKUSDT', baseAsset: 'LINK', name: 'Chainlink', displayName: 'LINK (LINKUSDT)' },
        { symbol: 'LTCUSDT', baseAsset: 'LTC', name: 'Litecoin', displayName: 'LTC (LTCUSDT)' },
        { symbol: 'BNBUSDT', baseAsset: 'BNB', name: 'Binance Coin', displayName: 'BNB (BNBUSDT)' },
        { symbol: 'DOGEUSDT', baseAsset: 'DOGE', name: 'Dogecoin', displayName: 'DOGE (DOGEUSDT)' },
        { symbol: 'AVAXUSDT', baseAsset: 'AVAX', name: 'Avalanche', displayName: 'AVAX (AVAXUSDT)' },
        { symbol: 'MATICUSDT', baseAsset: 'MATIC', name: 'Polygon', displayName: 'MATIC (MATICUSDT)' }
      ];
      setAvailableCoins(fallbackCoins);
    } finally {
      setIsLoadingCoins(false);
    }
  };

  const addTickerShortcut = (coin) => {
    const newShortcuts = [...localTickerShortcuts, coin];
    console.log('➕ Adding ticker shortcut:', coin);
    console.log('📋 New ticker shortcuts array:', newShortcuts);
    setLocalTickerShortcuts(newShortcuts);
    saveTickerShortcuts(newShortcuts);
    onTickerShortcutsChange(newShortcuts);
  };

  const removeTickerShortcut = (symbol) => {
    const newShortcuts = localTickerShortcuts.filter(coin => coin.symbol !== symbol);
    console.log('➖ Removing ticker shortcut:', symbol);
    setLocalTickerShortcuts(newShortcuts);
    saveTickerShortcuts(newShortcuts);
    onTickerShortcutsChange(newShortcuts);
  };

  const saveTickerShortcuts = (shortcuts) => {
    // No longer using localStorage - parent will handle backend save
    console.log('💾 Saving ticker shortcuts:', shortcuts);
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newShortcuts = [...localTickerShortcuts];
    const [draggedItem] = newShortcuts.splice(draggedIndex, 1);
    newShortcuts.splice(dropIndex, 0, draggedItem);

    setLocalTickerShortcuts(newShortcuts);
    setDraggedIndex(null);
    
    // Save to backend via parent
    onTickerShortcutsChange(newShortcuts);
    console.log('✅ Ticker order updated:', newShortcuts.map(c => c.baseAsset));
  };

  // Position settings functions
  const updatePositionSetting = (symbol, field, value) => {
    const newSettings = {
      ...localPositionSettings,
      [symbol]: {
        ...localPositionSettings[symbol],
        [field]: value
      }
    };
    setLocalPositionSettings(newSettings);
    savePositionSettings(newSettings);
    onPositionSettingsChange(newSettings);
  };

  const savePositionSettings = (settings) => {
    // No longer using localStorage - parent will handle backend save
    console.log('💾 Saving position settings:', settings);
  };

  const getDefaultPositionSettings = (symbol) => {
    return {
      sizePresets: ['10', '50', '100'],
      slippage: 1.00,
      ...localPositionSettings[symbol]
    };
  };

  // Leverage settings functions
  const updateLeverageSetting = (pair, leverage) => {
    const newSettings = {
      ...localLeverageSettings,
      [pair]: leverage
    };
    setLocalLeverageSettings(newSettings);
    saveLeverageSettings(newSettings);
    onLeverageSettingsChange(newSettings);
  };

  const saveLeverageSettings = (settings) => {
    // No longer using localStorage - parent will handle backend save
    console.log('💾 Saving leverage settings:', settings);
  };

  const updateAllPairsLeverage = async () => {
    const leverage = parseFloat(updateAllLeverage);
    if (isNaN(leverage) || leverage <= 0) {
      alert('Please enter a valid leverage value');
      return;
    }

    setIsUpdatingLeverage(true);
    
    try {
      // Update all ticker shortcuts with the new leverage
      const newSettings = {};
      localTickerShortcuts.forEach(coin => {
        newSettings[coin.symbol] = leverage;
      });
      
      // Also update default leverage
      newSettings['default'] = leverage;
      
      setLocalLeverageSettings(newSettings);
      saveLeverageSettings(newSettings);
      onLeverageSettingsChange(newSettings);
      
      setUpdateAllLeverage('');
      
      console.log(`✅ Updated all pairs to ${leverage}x leverage`);
    } catch (error) {
      console.error('Error updating leverage:', error);
      alert('Error updating leverage settings');
    } finally {
      setIsUpdatingLeverage(false);
    }
  };

  const getLeverageForPair = (symbol) => {
    return localLeverageSettings[symbol] || localLeverageSettings['default'] || 1;
  };

  // Exchange settings functions
  // No longer saving to localStorage - all handled by backend
  const saveExchangeSettings = (settings) => {
    // API keys are stored in backend, no need to save to localStorage
    console.log('ℹ️ Exchange settings updated (backend managed):', settings);
  };

  const testBinanceConnection = async () => {
    if (!apiKey || !secretKey) {
      alert('Please enter both API Key and Secret Key');
      return;
    }

    // Basic validation
    if (apiKey.length < 10 || secretKey.length < 10) {
      alert('API Key and Secret Key must be at least 10 characters long');
      return;
    }

    setIsTestingConnection(true);
    
    try {
      console.log('🔗 Adding API key to backend...');
      
      // Add API key to backend - it will validate and save it
      const result = await binanceBackendService.addApiKey(apiKey, secretKey);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add API key');
      }

      console.log('✅ API key added successfully to backend');

      // Reload connections from backend
      await loadExchangeConnections();

      // Update local state to show connection
      const exchangeSettings = {
        connected: true,
        connectedAt: new Date().toISOString()
      };

      setLocalExchangeSettings(exchangeSettings);
      onExchangeSettingsChange(exchangeSettings);
      
      // Clear the input fields
      setApiKey('');
      setSecretKey('');

      alert('✅ Successfully connected to Binance Futures API!\n\nYour API key has been securely stored on the server.');
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      
      // Reset connection state on failure
      const failedSettings = {
        connected: false,
        lastError: error.message
      };
      
      setLocalExchangeSettings(failedSettings);
      onExchangeSettingsChange(failedSettings);
      
      alert(`❌ Connection failed: ${error.message}\n\nPlease check:\n• Your API key and secret key are correct\n• Your API key has futures trading permissions\n• Your IP address is whitelisted (if required)`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const disconnectBinance = async () => {
    try {
      console.log('🔌 Disconnecting from Binance...');
      
      // Get connections from backend
      const connectionsResult = await binanceBackendService.getExchangeConnections();
      if (connectionsResult.success && connectionsResult.connections.length > 0) {
        // Remove all API keys
        for (const connection of connectionsResult.connections) {
          await binanceBackendService.removeApiKey(connection.id);
        }
      }
      
      const settings = {
        connected: false
      };
      
      setApiKey('');
      setSecretKey('');
      setLocalExchangeSettings(settings);
      setExchangeConnections([]);
      onExchangeSettingsChange(settings);
      
      console.log('🔌 Binance disconnected');
      alert('🔌 Binance account disconnected');
    } catch (error) {
      console.error('❌ Disconnect error:', error);
      alert(`❌ Disconnect failed: ${error.message}`);
    }
  };

  const removeApiKeyConnection = async (connectionId) => {
    try {
      console.log('🗑️ Removing API key connection:', connectionId);
      
      const result = await binanceBackendService.removeApiKey(connectionId);
      
      if (result.success) {
        console.log('✅ API key removed successfully');
        
        // Reload connections
        await loadExchangeConnections();
        
        // If no connections left, update settings
        if (exchangeConnections.length <= 1) {
          const settings = { connected: false };
          setLocalExchangeSettings(settings);
          onExchangeSettingsChange(settings);
        }
        
        alert('✅ API key removed successfully');
      } else {
        throw new Error(result.error || 'Failed to remove API key');
      }
    } catch (error) {
      console.error('❌ Remove API key error:', error);
      alert(`❌ Remove failed: ${error.message}`);
    }
  };

  const filteredCoins = availableCoins.filter(coin =>
    coin.baseAsset.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isCoinAlreadyAdded = (symbol) => {
    return localTickerShortcuts.some(coin => coin.symbol === symbol);
  };

  // RSS Feed functions
  const addRssFeed = async () => {
    if (!newRssUrl.trim() || !newRssName.trim()) {
      return;
    }

    // Basic URL validation
    try {
      new URL(newRssUrl);
    } catch (error) {
      alert('Please enter a valid URL');
      return;
    }

    // Test the RSS feed before adding
    const isValid = await testRssFeed(newRssUrl.trim());
    if (!isValid) {
      alert('RSS feed is not accessible or invalid. Please check the URL.');
      return;
    }

    const newFeed = {
      id: `rss_${Date.now()}`,
      name: newRssName.trim(),
      url: newRssUrl.trim(),
      category: 'custom',
      enabled: true
    };

    const updated = [...localRssFeeds, newFeed];
    setLocalRssFeeds(updated);
    
    if (onRssFeedsChange) {
      onRssFeedsChange(updated);
    }

    setNewRssName('');
    setNewRssUrl('');
    alert('RSS feed added successfully!');
  };

  const removeRssFeed = (feedId) => {
    const updated = localRssFeeds.filter(feed => feed.id !== feedId);
    setLocalRssFeeds(updated);
    
    if (onRssFeedsChange) {
      onRssFeedsChange(updated);
    }
  };

  const toggleRssFeed = (feedId) => {
    const updated = localRssFeeds.map(feed => 
      feed.id === feedId ? { ...feed, enabled: !feed.enabled } : feed
    );
    setLocalRssFeeds(updated);
    
    if (onRssFeedsChange) {
      onRssFeedsChange(updated);
    }
  };

  const testRssFeed = async (url) => {
    if (!url.trim()) return false;
    
    setTestingRss(true);
    try {
      console.log('Testing RSS feed:', url);
      
      // For now, we'll just validate the URL format and assume it's valid
      // since CORS proxies are not reliable
      const urlPattern = /^https?:\/\/.+/;
      const isValidUrl = urlPattern.test(url);
      
      if (isValidUrl) {
        console.log('URL format is valid, assuming RSS feed is accessible');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('RSS feed test failed:', error);
      return false;
    } finally {
      setTestingRss(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg w-full max-w-6xl h-[90vh] flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-[#0f0f0f] border-r border-[#333] flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[#333]">
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>
          
          {/* Sidebar Menu */}
          <div className="flex-1 py-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'general'
                  ? 'bg-[#1a1a1a] text-white border-r-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-[#111]'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('exchange')}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'exchange'
                  ? 'bg-[#1a1a1a] text-white border-r-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-[#111]'
              }`}
            >
              Exchange Settings
            </button>
            <button
              onClick={() => setActiveTab('position')}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'position'
                  ? 'bg-[#1a1a1a] text-white border-r-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-[#111]'
              }`}
            >
              Position Settings
            </button>
            <button
              onClick={() => setActiveTab('leverage')}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'leverage'
                  ? 'bg-[#1a1a1a] text-white border-r-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-[#111]'
              }`}
            >
              Leverage Settings
            </button>
            <button
              onClick={() => setActiveTab('cryptoDetected')}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'cryptoDetected'
                  ? 'bg-[#1a1a1a] text-white border-r-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-[#111]'
              }`}
            >
              CryptoDetected
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Content Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#333]">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {activeTab === 'general' && 'General Settings'}
                {activeTab === 'exchange' && 'Exchange Settings'}
                {activeTab === 'position' && 'Position Settings'}
                {activeTab === 'leverage' && 'Leverage Settings'}
                {activeTab === 'cryptoDetected' && 'CryptoDetected'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {activeTab === 'general' && 'Manage ticker shortcuts and general preferences'}
                {activeTab === 'exchange' && 'Connect your Binance account for live trading'}
                {activeTab === 'position' && 'Set position sizes for order buttons'}
                {activeTab === 'leverage' && 'Configure leverage settings for trading pairs'}
                {activeTab === 'cryptoDetected' && 'Add coins to monitor in news articles'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#333] rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="flex flex-col">
              {/* Ticker Shortcuts Section */}
              <div className="p-4 border-b border-[#333]">
                <h3 className="text-md font-semibold text-white mb-2">Ticker Shortcuts</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Add coins to display in the ticker section. These will be automatically updated with live data from Binance.
                </p>

                {/* Current Shortcuts */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Current Tickers ({localTickerShortcuts.length})
                    <span className="ml-2 text-xs text-gray-500">(Drag to reorder)</span>
                  </h4>
                  {localTickerShortcuts.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-[#222] rounded p-3">
                      No ticker shortcuts added yet. Add some coins below to display them in the ticker section.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {localTickerShortcuts.map((coin, index) => (
                        <div
                          key={coin.symbol || `ticker-${coin.baseAsset}-${index}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          className="flex items-center justify-between bg-[#222] rounded p-2 text-sm cursor-move hover:bg-[#2a2a2a] transition-colors"
                        >
                          <span className="text-white flex items-center">
                            <span className="text-gray-500 mr-2 text-xs">⋮⋮</span>
                            {coin.baseAsset}
                          </span>
                          <button
                            onClick={() => removeTickerShortcut(coin.symbol)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Coins */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Add New Tickers</h4>
                  
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search coins (e.g., BTC, ETH, ADA)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#222] border border-[#333] rounded text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                    />
                  </div>

                  {/* Available Coins List */}
                  <div className="max-h-48 overflow-y-auto border border-[#333] rounded">
                    {isLoadingCoins ? (
                      <div className="p-4 text-center text-gray-400">
                        <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-2 text-sm">Loading available coins...</p>
                      </div>
                    ) : filteredCoins.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">
                        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm">No coins found matching your search.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#333]">
                        {filteredCoins.slice(0, 50).map((coin) => (
                          <div
                            key={coin.symbol}
                            className="flex items-center justify-between p-3 hover:bg-[#222] transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {coin.baseAsset.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="text-white font-medium">{coin.baseAsset}</div>
                                <div className="text-xs text-gray-400">{coin.name}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => addTickerShortcut(coin)}
                              disabled={isCoinAlreadyAdded(coin.symbol)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                isCoinAlreadyAdded(coin.symbol)
                                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {isCoinAlreadyAdded(coin.symbol) ? (
                                <>
                                  <Check className="w-3 h-3 inline mr-1" />
                                  Added
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 inline mr-1" />
                                  Add
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'position' && (
            <div className="p-4">
              <div>
                <h3 className="text-md font-semibold text-white mb-2">Position Settings</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Set the position sizes for order buttons. Configure size presets and slippage for each ticker.
                </p>

                {localTickerShortcuts.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">No tickers configured</p>
                    <p className="text-sm text-gray-500">
                      Add some tickers in the General tab first to configure their position settings.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Default Size Presets */}
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-medium">Default size presets</h4>
                        <span className="text-gray-400 text-sm">$</span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-gray-300 text-sm mb-2 block">Size Presets</label>
                          <div className="flex space-x-2">
                            {['10', '50', '100'].map((preset, index) => (
                              <input
                                key={index}
                                type="text"
                                value={localPositionSettings['default']?.sizePresets?.[index] || preset}
                                onChange={(e) => updatePositionSetting('default', 'sizePresets', 
                                  (localPositionSettings['default']?.sizePresets || ['10', '50', '100'])
                                    .map((val, i) => i === index ? e.target.value : val)
                                )}
                                className="flex-1 bg-[#0f0f0f] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-blue-400 focus:outline-none"
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-gray-300 text-sm mb-2 block">Slippage</label>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              min="0.1"
                              max="5"
                              step="0.1"
                              value={localPositionSettings['default']?.slippage || 1.0}
                              onChange={(e) => updatePositionSetting('default', 'slippage', parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-[#333] rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-white text-sm w-16 text-right">
                              {localPositionSettings['default']?.slippage || 1.0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Individual Ticker Settings */}
                    {localTickerShortcuts.map((coin, index) => {
                      const settings = getDefaultPositionSettings(coin.baseAsset);
                      return (
                        <div key={coin.symbol || `position-${coin.baseAsset}-${index}`} className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-medium">{coin.baseAsset} size presets</h4>
                            <span className="text-gray-400 text-sm">${coin.baseAsset}</span>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-gray-300 text-sm mb-2 block">Size Presets</label>
                              <div className="flex space-x-2">
                                {settings.sizePresets.map((preset, index) => (
                                  <input
                                    key={index}
                                    type="text"
                                    value={preset}
                                    onChange={(e) => updatePositionSetting(coin.baseAsset, 'sizePresets', 
                                      settings.sizePresets.map((val, i) => i === index ? e.target.value : val)
                                    )}
                                    className="flex-1 bg-[#0f0f0f] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-blue-400 focus:outline-none"
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-gray-300 text-sm mb-2 block">Slippage</label>
                              <div className="flex items-center space-x-3">
                                <input
                                  type="range"
                                  min="0.1"
                                  max="5"
                                  step="0.1"
                                  value={settings.slippage}
                                  onChange={(e) => updatePositionSetting(coin.baseAsset, 'slippage', parseFloat(e.target.value))}
                                  className="flex-1 h-2 bg-[#333] rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-white text-sm w-16 text-right">
                                  {settings.slippage}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'leverage' && (
            <div className="p-4">
              <div>
                <h3 className="text-md font-semibold text-white mb-2">Leverage Settings</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Set your Binance futures pair leverages. Configure leverage for all pairs to avoid inconsistencies.
                </p>

                {/* Update All Pairs Section */}
                <div className="mb-8">
                  <h4 className="text-white font-medium mb-2">Update All Pairs</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Set the leverage for all pairs. Don't close the page while updating.
                  </p>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      placeholder="Enter leverage"
                      value={updateAllLeverage}
                      onChange={(e) => setUpdateAllLeverage(e.target.value)}
                      min="1"
                      max="125"
                      step="1"
                      className="flex-1 bg-[#0f0f0f] border border-[#333] rounded-md px-3 py-2 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                    />
                    <button
                      onClick={updateAllPairsLeverage}
                      disabled={isUpdatingLeverage || !updateAllLeverage}
                      className="bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingLeverage ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                          <span>Updating...</span>
                        </div>
                      ) : (
                        'Update'
                      )}
                    </button>
                  </div>
                </div>

                {/* Individual Pair Settings */}
                {localTickerShortcuts.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">No pairs configured</p>
                    <p className="text-sm text-gray-500">
                      Add some tickers in the General tab first to configure their leverage settings.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-white font-medium mb-4">Individual Pair Settings</h4>
                    
                    {/* Default Leverage */}
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-white font-medium">Default Leverage</h5>
                          <p className="text-sm text-gray-400">Applied to new pairs</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            value={getLeverageForPair('default')}
                            onChange={(e) => updateLeverageSetting('default', parseFloat(e.target.value) || 1)}
                            min="1"
                            max="125"
                            step="1"
                            className="w-20 bg-[#0f0f0f] border border-[#333] rounded px-3 py-2 text-white text-center focus:border-blue-400 focus:outline-none"
                          />
                          <span className="text-gray-400 text-sm">x</span>
                        </div>
                      </div>
                    </div>

                    {/* Individual Pairs */}
                    {localTickerShortcuts.map((coin, index) => (
                      <div key={coin.symbol || `leverage-${coin.baseAsset}-${index}`} className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-white font-medium">{coin.baseAsset}</h5>
                            <p className="text-sm text-gray-400">{coin.symbol}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="number"
                              value={getLeverageForPair(coin.symbol)}
                              onChange={(e) => updateLeverageSetting(coin.symbol, parseFloat(e.target.value) || 1)}
                              min="1"
                              max="125"
                              step="1"
                              className="w-20 bg-[#0f0f0f] border border-[#333] rounded px-3 py-2 text-white text-center focus:border-blue-400 focus:outline-none"
                            />
                            <span className="text-gray-400 text-sm">x</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Leverage Information */}
                <div className="mt-8 p-4 bg-[#1a1a1a] border border-[#333] rounded-lg">
                  <h4 className="text-white font-medium mb-2">ℹ️ Leverage Information</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Maximum leverage: 125x for most pairs</li>
                    <li>• Higher leverage = Higher risk and reward</li>
                    <li>• Default leverage is applied to new pairs automatically</li>
                    <li>• Individual pair settings override default settings</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exchange' && (
            <div className="p-4">
              <div>
                <h3 className="text-md font-semibold text-white mb-2">Exchange Settings</h3>
                <p className="text-sm text-gray-400 mb-2">
                  Connect your Binance account to enable live trading and real-time wallet data.
                </p>
                

                {/* Connection Status */}
                <div className="mb-6">
                  <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#333] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${localExchangeSettings.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <h4 className="text-white font-medium">
                          {localExchangeSettings.connected ? 'Connected' : 'Not Connected'}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {localExchangeSettings.connected ? 'Binance account is connected' : 'No Binance account connected'}
                        </p>
                      </div>
                    </div>
                    {localExchangeSettings.connected && (
                      <button
                        onClick={disconnectBinance}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                {/* Current API Keys */}
                {isLoadingConnections ? (
                  <div className="mb-6 flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-gray-400">Loading connections...</span>
                  </div>
                ) : exchangeConnections.length > 0 ? (
                  <div className="mb-6">
                    <h4 className="text-white font-medium mb-3">Current API Keys ({exchangeConnections.length})</h4>
                    <div className="space-y-2">
                      {exchangeConnections.map(connection => (
                        <div
                          key={connection.id}
                          className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#333] rounded"
                        >
                          <div>
                            <div className="text-white font-medium">{connection.exchangeName}</div>
                            <div className="text-sm text-gray-400">API Key: {connection.apiKeyMasked}</div>
                            <div className="text-xs text-gray-500">
                              Added: {new Date(connection.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => removeApiKeyConnection(connection.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* API Configuration */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Add New API Key</h4>
                  
                  {/* API Key */}
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">API Key</label>
                    <input
                      type="password"
                      placeholder="Enter your Binance API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-[#333] rounded-md px-3 py-2 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                    />
                  </div>

                  {/* Secret Key */}
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Secret Key</label>
                    <input
                      type="password"
                      placeholder="Enter your Binance Secret Key"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-[#333] rounded-md px-3 py-2 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                    />
                  </div>


                  {/* Connect Button */}
                  <div className="pt-4">
                    <button
                      onClick={testBinanceConnection}
                      disabled={isTestingConnection || !apiKey || !secretKey}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTestingConnection ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Adding API Key...</span>
                        </div>
                      ) : (
                        'Add API Key'
                      )}
                    </button>
                  </div>
                </div>

                {/* API Permissions Info */}
                <div className="mt-8 p-4 bg-[#1a1a1a] border border-[#333] rounded-lg">
                  <h4 className="text-white font-medium mb-2">🔑 API Permissions Required</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• <strong>Enable Reading:</strong> View account balance and positions</li>
                    <li>• <strong>Enable Futures:</strong> Trade futures contracts</li>
                    <li>• <strong>Enable Spot & Margin Trading:</strong> Execute trades</li>
                    <li>• <strong>IP Restriction:</strong> Restrict API access to your IP (recommended)</li>
                  </ul>
                </div>

                {/* Security Warning */}
                <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <h4 className="text-yellow-400 font-medium mb-2">⚠️ Security Warning</h4>
                  <ul className="text-sm text-yellow-200 space-y-1">
                    <li>• Never share your API keys with anyone</li>
                    <li>• Use IP restrictions for enhanced security</li>
                    <li>• Regularly rotate your API keys</li>
                    <li>• Test with small amounts first</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cryptoDetected' && (
            <div className="p-4">
              <div>
                <h3 className="text-md font-semibold text-white mb-2">CryptoDetected</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Add coins to monitor in news articles. When these coins are mentioned in news titles or descriptions, their CoinBar will be automatically created.
                </p>

                {/* Search for coins */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search for coins to add..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#333] rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Available coins list */}
                {isLoadingCoins ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-gray-400">Loading coins...</span>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-[#333] rounded">
                    {availableCoins
                      .filter(coin => 
                        coin.baseAsset.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        coin.name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .slice(0, 50)
                      .map(coin => (
                        <div
                          key={coin.symbol}
                          className="flex items-center justify-between p-3 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
                        >
                          <div>
                            <div className="text-white font-medium">{coin.baseAsset}</div>
                            <div className="text-sm text-gray-400">{coin.name}</div>
                          </div>
                          <button
                            onClick={() => {
                              // Backend expects string array of baseAssets like ['BTC', 'ETH', 'SOL']
                              const updated = [...localCryptoDetectedCoins, coin.baseAsset];
                              setLocalCryptoDetectedCoins(updated);
                              if (onCryptoDetectedCoinsChange) {
                                onCryptoDetectedCoinsChange(updated);
                              }
                            }}
                            disabled={localCryptoDetectedCoins.includes(coin.baseAsset)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                          >
                            {localCryptoDetectedCoins.includes(coin.baseAsset) ? 'Added' : 'Add'}
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                {/* Current detected coins */}
                <div className="mt-6">
                  <h4 className="text-white font-medium mb-3">
                    Current Detected Coins ({Array.isArray(localCryptoDetectedCoins) ? localCryptoDetectedCoins.length : 0})
                  </h4>
                  {!Array.isArray(localCryptoDetectedCoins) || localCryptoDetectedCoins.length === 0 ? (
                    <div className="text-gray-400 text-sm py-4">No coins added yet. Add coins above to monitor them in news.</div>
                  ) : (
                    <div className="space-y-2">
                      {localCryptoDetectedCoins.map((coinSymbol, index) => {
                        // Handle both string and object formats for backward compatibility
                        const displaySymbol = typeof coinSymbol === 'string' ? coinSymbol : coinSymbol?.baseAsset || 'Unknown';
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#333] rounded"
                          >
                            <div>
                              <div className="text-white font-medium">{displaySymbol}</div>
                              <div className="text-sm text-gray-400">Monitored in news</div>
                            </div>
                            <button
                              onClick={() => {
                                const updated = localCryptoDetectedCoins.filter((c, i) => i !== index);
                                setLocalCryptoDetectedCoins(updated);
                                if (onCryptoDetectedCoinsChange) {
                                  onCryptoDetectedCoinsChange(updated);
                                }
                              }}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                  <h4 className="text-blue-400 font-medium mb-2">📰 How it works</h4>
                  <ul className="text-sm text-blue-300 space-y-1">
                    <li>• Added coins will be searched in news titles and descriptions</li>
                    <li>• When a coin is found, its CoinBar will be automatically created</li>
                    <li>• Search is case-insensitive and includes coin symbols and names</li>
                    <li>• Coins are stored locally and persist across sessions</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-4 border-t border-[#333]">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
