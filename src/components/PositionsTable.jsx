import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import binanceBackendService from '../services/binanceBackendService';
import { showSuccess, showError } from './NotificationSystem';

const PositionsTable = ({ exchangeSettings = {}, onSymbolClick }) => {
  const [activeTab, setActiveTab] = useState('positions');
  const [positions, setPositions] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [positionSizeInputs, setPositionSizeInputs] = useState({});
  const [limitPriceInputs, setLimitPriceInputs] = useState({});
  const [showPercentagePopup, setShowPercentagePopup] = useState({});
  const [popupPosition, setPopupPosition] = useState({});
  const quantityInputRefs = useRef({});

  // Fetch positions and orders from backend
  const fetchPositionsAndOrders = async (manualRefresh = false) => {
    if (!exchangeSettings.connected) {
      console.log('⚠️ PositionsTable: Not connected, clearing positions');
      setPositions([]);
      setOpenOrders([]);
      return;
    }

    // Skip if rate limited
    if (isRateLimited) {
      console.log('⏸️ Skipping fetch due to rate limit');
      return;
    }

    setError(null);
    if (manualRefresh) {
      setIsRefreshing(true);
    }

    try {
      // Fetch positions from backend
      console.log('📍 Fetching positions from backend...');
      console.log('🔗 Exchange connected:', exchangeSettings.connected);
      const positionsResult = await binanceBackendService.getPositions();
      console.log('📥 Positions result:', positionsResult);
      console.log('📊 Result success:', positionsResult.success);
      console.log('📊 Result has positions:', !!positionsResult.positions);
      console.log('📊 Result has data:', !!positionsResult.data);
      console.log('📊 Positions type:', typeof positionsResult.positions);
      console.log('📊 Positions is array:', Array.isArray(positionsResult.positions));
      if (positionsResult.positions) {
        console.log('📊 Positions length:', positionsResult.positions.length);
      }
      if (positionsResult.error) {
        console.error('❌ Positions result error:', positionsResult.error);
      }

      if (positionsResult.success) {
        // Backend returns positions in data field
        const allPositions = positionsResult.positions || positionsResult.data || [];
        console.log('📦 All positions count (before filter):', allPositions.length);
        console.log('📦 All positions:', allPositions);
        
       
        
        // Filter out positions with zero size
        // Handle both camelCase (positionAmt) and PascalCase (PositionAmt) from backend
        const activePositions = allPositions.filter(pos => {
          const positionAmt = parseFloat(
            pos.positionAmt || pos.PositionAmt || pos.positionAmount || pos.PositionAmount || 0
          );
          const isActive = positionAmt !== 0;
          if (!isActive && allPositions.length > 0) {
            console.log(`🔍 Filtered out position ${pos.symbol || pos.Symbol || 'unknown'}: positionAmt=${pos.positionAmt || pos.PositionAmt}, parsed=${positionAmt}`);
          }
          return isActive;
        });
        
        console.log('✅ Active positions count (after filter):', activePositions.length);
        console.log('✅ Active positions:', activePositions);
        setPositions(activePositions);
        
        // Initialize input values for new positions (only if not manually edited)
        activePositions.forEach(position => {
          const symbol = position.symbol || position.Symbol;
          const positionAmt = parseFloat(position.positionAmt || position.PositionAmt || 0);
          const markPrice = parseFloat(position.markPrice || position.MarkPrice || 0);
          
          // Set to mark price and full quantity (all) if not already set
          setPositionSizeInputs(prev => {
            // Only update if undefined (not set yet), allow empty string
            if (prev[symbol] === undefined) {
              return {
                ...prev,
                [symbol]: Math.round(Math.abs(positionAmt)).toString()
              };
            }
            return prev;
          });
          
          setLimitPriceInputs(prev => {
            // Only update if undefined (not set yet), allow empty string
            if (prev[symbol] === undefined) {
              return {
                ...prev,
                [symbol]: markPrice.toFixed(4)
              };
            }
            return prev;
          });
        });
      } else {
        console.warn('⚠️ Failed to fetch positions:', positionsResult.error);
        setError(positionsResult.error || 'Failed to load positions');
      }

      // Fetch open orders from backend
      console.log('📋 Fetching open orders from backend...');
      const ordersResult = await binanceBackendService.getOpenOrders();
      console.log('📥 Open orders result:', ordersResult);
      
      if (ordersResult.success) {
        const allOrders = ordersResult.orders || [];
        console.log('✅ Open orders count:', allOrders.length);
        console.log('✅ Open orders:', allOrders);
        setOpenOrders(allOrders);
      } else {
        console.warn('⚠️ Failed to fetch open orders:', ordersResult.error);
        setOpenOrders([]);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ Error fetching positions:', error);
      setError(error.message);
    } finally {
      if (manualRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  // Auto-refresh every 5 seconds (reduced frequency for backend calls)
  useEffect(() => {
    if (exchangeSettings.connected) {
      fetchPositionsAndOrders();
      
      // Set up periodic refresh every 5 seconds
      const interval = setInterval(fetchPositionsAndOrders, 5000);
      return () => clearInterval(interval);
    } else {
      setPositions([]);
      setOpenOrders([]);
    }
  }, [exchangeSettings.connected]);

  // Close a specific position (via backend)
  const closePosition = async (symbol) => {
    if (!exchangeSettings.connected) {
      alert('Please connect to Binance first');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to close the ${symbol} position?`);
    if (!confirmed) return;

    try {
      console.log(`🔴 Closing position for ${symbol} via backend`);
      
      const result = await binanceBackendService.closePosition(symbol, null);

      if (result.success) {
        console.log('✅ Position closed successfully');
        showSuccess('Position Closed', `${symbol} position closed successfully`, null, 3000);
        
        // Clear the position size input so it resets to placeholder
        setPositionSizeInputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[symbol];
          return newInputs;
        });
        
        // Immediate refresh after closing position
        setTimeout(() => fetchPositionsAndOrders(), 1000);
      } else {
        console.error('❌ Failed to close position:', result.error);
        showError('Close Failed', result.error || 'Failed to close position', null, 3000);
      }
    } catch (error) {
      console.error('❌ Error closing position:', error);
      showError('Error', error.message || 'Error closing position', null, 3000);
    }
  };

  // Close position with Market order (via backend)
  const closePositionMarket = async (symbol) => {
    if (!exchangeSettings.connected) {
      showError('Connection Required', 'Please connect to Binance first', null, 3000);
      return;
    }

    // Get quantity from input
    const quantity = positionSizeInputs[symbol];
    
    // Validate quantity if provided
    if (quantity && (quantity === '0' || quantity === '' || isNaN(parseFloat(quantity)))) {
      showError('Invalid Size', 'Please enter a valid quantity');
      return;
    }

    const quantityValue = quantity ? parseFloat(quantity) : null;

    if (quantityValue !== null && quantityValue <= 0) {
      showError('Invalid Size', 'Quantity must be greater than 0');
      return;
    }

    try {
      console.log(`🔴 Closing position with Market order for ${symbol} via backend`, {
        quantity: quantityValue,
        isCloseAll: quantityValue === null
      });
      
      const result = await binanceBackendService.closePosition(symbol, quantityValue);

      if (result.success) {
        console.log('✅ Position closed successfully with Market order');
        showSuccess('Position Closed', `${symbol} position closed successfully`, {
          'Order Type': 'Market',
          'Symbol': symbol,
          'Quantity': quantityValue !== null ? quantityValue.toString() : 'ALL',
          'Status': 'FILLED'
        }, 5000);
        
        // Reset inputs to allow fresh data on next fetch
        setPositionSizeInputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[symbol];
          return newInputs;
        });
        
        setLimitPriceInputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[symbol];
          return newInputs;
        });
        
        // Immediate refresh after closing position (will repopulate inputs with new position data)
        setTimeout(() => fetchPositionsAndOrders(), 1000);
      } else {
        console.error('❌ Failed to close position:', result.error);
        showError('Close Position Failed', result.error, {
          'Symbol': symbol,
          'Order Type': 'Market',
          'Details': result.details || 'Unknown error'
        }, 5000);
      }
    } catch (error) {
      console.error('❌ Error closing position:', error);
      showError('Close Position Error', error.message, {
        'Symbol': symbol,
        'Order Type': 'Market'
      }, 5000);
    }
  };

  // Handle position size input click
  const handlePositionSizeClick = (symbol) => {
    const inputElement = quantityInputRefs.current[symbol];
    if (inputElement) {
      const rect = inputElement.getBoundingClientRect();
      setPopupPosition(prev => ({
        ...prev,
        [symbol]: {
          top: rect.bottom + 4, // 4px gap below input
          left: rect.left
        }
      }));
    }
    
    setShowPercentagePopup(prev => ({
      ...prev,
      [symbol]: !prev[symbol]
    }));
  };

  // Handle percentage button click
  const handlePercentageClick = (symbol, percentage, currentSize) => {
    // Always round to whole number
    const newSize = Math.round(currentSize * percentage / 100);
    setPositionSizeInputs(prev => ({
      ...prev,
      [symbol]: newSize.toString()
    }));
    
    // Close popup after selection
    setShowPercentagePopup(prev => ({
      ...prev,
      [symbol]: false
    }));
  };

  // Close all percentage popups
  const closeAllPercentagePopups = () => {
    setShowPercentagePopup({});
  };

  // Handle symbol click to open in TradingView
  const handleSymbolClick = (symbol) => {
    if (onSymbolClick) {
      // Convert XRPUSDT to BINANCE:XRPUSDT format
      const binanceSymbol = symbol.startsWith('BINANCE:') ? symbol : `BINANCE:${symbol}`;
      onSymbolClick(binanceSymbol);
    }
  };

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside all quantity inputs and popups
      const clickedInsidePopup = event.target.closest('.quantity-popup');
      const clickedInsideInput = Object.values(quantityInputRefs.current).some(
        (ref) => ref && ref.contains(event.target)
      );
      
      if (!clickedInsidePopup && !clickedInsideInput) {
        closeAllPercentagePopups();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close position with Limit order
  const closePositionLimit = async (symbol, side, positionSide) => {
    if (!exchangeSettings.connected) {
      showError('Connection Required', 'Please connect to Binance first');
      return;
    }

    // Get quantity and price from inputs
    const quantity = positionSizeInputs[symbol];
    const price = limitPriceInputs[symbol];

    // Validate quantity
    if (!quantity || quantity === '0' || quantity === '' || isNaN(parseFloat(quantity))) {
      showError('Invalid Size', 'Please enter a valid quantity');
      return;
    }

    // Validate price
    if (!price || price === '0' || price === '' || isNaN(parseFloat(price))) {
      showError('Invalid Price', 'Please enter a valid limit price');
      return;
    }

    const quantityValue = parseFloat(quantity);
    const priceValue = parseFloat(price);

    if (quantityValue <= 0) {
      showError('Invalid Size', 'Quantity must be greater than 0');
      return;
    }

    if (priceValue <= 0) {
      showError('Invalid Price', 'Price must be greater than 0');
      return;
    }

    try {
      console.log('🔍 Frontend - Limit Order Parameters:', {
        symbol,
        side,
        quantity: quantityValue,
        quantityFormatted: quantityValue.toFixed(8),
        price: priceValue,
        priceFormatted: priceValue.toFixed(4),
        positionSide
      });
      
      const result = await binanceBackendService.placeLimitOrder(
        symbol,
        side,
        quantityValue.toFixed(8),
        priceValue.toFixed(4),
        positionSide
      );

      if (result.success) {
        showSuccess(
          'Limit Order Placed',
          `${side} limit order placed successfully`,
          {
            Symbol: symbol,
            Size: quantityValue.toFixed(1),
            Price: priceValue.toFixed(4),
            'Order ID': result.order.orderId
          }
        );
        
        // Reset inputs to allow fresh data on next fetch
        setPositionSizeInputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[symbol];
          return newInputs;
        });
        
        setLimitPriceInputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[symbol];
          return newInputs;
        });
        
        // Refresh positions and orders (will repopulate inputs with new position data)
        await fetchPositionsAndOrders();
      } else {
        throw new Error(result.error || 'Failed to place limit order');
      }
    } catch (error) {
      showError('Order Failed', error.message || 'Failed to place limit order');
    }
  };

  // Cancel order
  const cancelOrder = async (symbol, orderId) => {
    if (!exchangeSettings.connected) {
      showError('Connection Required', 'Please connect to Binance first', null, 3000);
      return;
    }

    try {
      console.log(`❌ Canceling order ${orderId} for ${symbol} via backend`);
      
      const result = await binanceBackendService.cancelOrder(symbol, orderId);

      if (result.success) {
        console.log('✅ Order cancelled successfully');
        showSuccess('Order Cancelled', `${symbol} order cancelled successfully`, {
          'Symbol': symbol,
          'Order ID': orderId
        }, 3000);
        
        // Refresh orders after cancellation
        setTimeout(() => fetchPositionsAndOrders(), 1000);
      } else {
        console.error('❌ Failed to cancel order:', result.error);
        showError('Cancel Failed', result.error || 'Failed to cancel order', null, 3000);
      }
    } catch (error) {
      console.error('❌ Error canceling order:', error);
      showError('Error', error.message || 'Error canceling order', null, 3000);
    }
  };

  // Close all positions (via backend)
  const closeAllPositions = async () => {
    if (!exchangeSettings.connected) {
      showError('Connection Required', 'Please connect to Binance first', null, 3000);
      return;
    }

    if (positions.length === 0) {
      showError('No Positions', 'No positions to close', null, 3000);
      return;
    }

    try {
      console.log(`🔴 Closing all ${positions.length} positions via backend`);
      
      const closePromises = positions.map(position => 
        binanceBackendService.closePosition(position.symbol || position.Symbol, null)
      );

      const results = await Promise.all(closePromises);
      const successful = results.filter(r => r.success).length;
      const failed = positions.length - successful;
      
      console.log(`✅ Closed ${successful}/${positions.length} positions successfully`);
      
      if (successful === positions.length) {
        showSuccess('All Positions Closed', `Successfully closed all ${successful} positions`, {
          'Total Closed': successful,
          'Order Type': 'Market',
          'Status': 'All FILLED'
        }, 6000);
      } else if (successful > 0) {
        showError('Partial Success', `Closed ${successful}/${positions.length} positions`, {
          'Successful': successful,
          'Failed': failed,
          'Order Type': 'Market'
        }, 6000);
      } else {
        showError('Close All Failed', 'Failed to close any positions', {
          'Total Attempted': positions.length,
          'Successful': 0,
          'Failed': failed
        }, 6000);
      }
      
      // Immediate refresh after closing all positions
      setTimeout(() => fetchPositionsAndOrders(), 1000);
    } catch (error) {
      console.error('❌ Error closing positions:', error);
      showError('Close All Error', error.message, {
        'Total Positions': positions.length,
        'Action': 'Close All'
      }, 6000);
    }
  };

  return (
    <div className="bg-[#0f0f0f] border border-[#222] rounded-lg p-4 text-[13px] font-sans text-gray-400 select-text overflow-x-auto">
      {/* Header with tabs and controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-6">
        <button 
          className={`font-bold transition-colors ${
              activeTab === 'positions' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('positions')}
        >
          Positions ({positions.length})
        </button>
        <button 
          className={`transition-colors ${
              activeTab === 'orders' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('orders')}
        >
          Open Orders ({openOrders.length})
        </button>
      </div>
      
      <div className="flex items-center space-x-3">
        {lastUpdate && (
          <span className="text-[10px] text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={() => fetchPositionsAndOrders(true)}
          disabled={isRefreshing || !exchangeSettings.connected}
          className="p-1.5 hover:bg-[#333] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh positions"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      </div>
      
      {/* Positions Table */}
      {activeTab === 'positions' && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left text-white/80 border-collapse border-separate border-spacing-x-6 border-spacing-y-0" onClick={closeAllPercentagePopups}>
        <thead>
              <tr>
                <th className="pb-4">Symbol</th>
                <th className="pb-4">Size</th>
                <th className="pb-4">Entry Price</th>
                <th className="pb-4">Mark Price</th>
                <th className="pb-4">Last Price</th>
                <th className="pb-4">Breakeven Price</th>
                <th className="pb-4">Est. Liq. Price</th>
                <th className="pb-4">Margin</th>
                <th className="pb-4">PnL (ROI %)</th>
                 <th className="pb-4 text-yellow-400 text-[13px] font-semibold">
                   {positions.length > 0 && (
                     <button
                       onClick={closeAllPositions}
                       className="hover:underline"
                     >
                       Close All Positions
                     </button>
                   )}
              </th>
          </tr>
        </thead>
        <tbody>
           
              {!exchangeSettings.connected ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Connect to Binance in Settings → Exchange Settings</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-red-400">
                    <div className="flex items-center justify-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>
                        {isRateLimited ? (
                          <span>
                            Rate limit exceeded. Retrying in {retryAfter} seconds...
                          </span>
                        ) : (
                          `Error: ${error}`
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : positions.length > 0 ? (
                positions.map((position, index) => {
                  // Handle both camelCase and PascalCase from backend
                  const positionAmt = parseFloat(
                    position.positionAmt || position.PositionAmt || 0
                  );
                  const entryPrice = parseFloat(
                    position.entryPrice || position.EntryPrice || 0
                  );
                  const markPrice = parseFloat(
                    position.markPrice || position.MarkPrice || 0
                  );
                  const unrealizedPnl = parseFloat(
                    position.unrealizedProfit || position.UnrealizedProfit || 
                    position.unRealizedProfit || 0
                  );
                  const isLong = positionAmt > 0;
                  const leverage = parseFloat(
                    position.leverage || position.Leverage || 1
                  );
                  const liquidationPrice = parseFloat(
                    position.liquidationPrice || position.LiquidationPrice || 0
                  );
                  
                  // Use notional from API (position size in USDT)
                  const notional = Math.abs(parseFloat(
                    position.notional || position.Notional || 0
                  ));
                  
                  // Calculate margin from API data (Initial Margin)
                  const marginType = position.marginType || position.MarginType || 'cross';
                  const margin = marginType === 'isolated' 
                    ? parseFloat(position.isolatedMargin || position.IsolatedMargin || 0)
                    : notional / leverage; // Cross margin = notional / leverage
                  
                  // Calculate ROI: (Unrealized PnL / Initial Margin) × 100
                  const roiPercentage = margin > 0 ? (unrealizedPnl / margin) * 100 : 0;
                  
                  return (
                    
                    <tr key={index} className="align-top">
                      
                      {/* Symbol */}
                      <td className="pr-6">
                        <div className="flex items-center space-x-2">
                          <div 
                            className={`border-l-4 ${isLong ? 'border-l-green-500' : 'border-l-red-500'} pl-2 cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={() => handleSymbolClick(position.symbol || position.Symbol)}
                          >
                            <div className="font-extrabold text-[13px] leading-none">{position.symbol || position.Symbol}</div>
                            <div className="text-[10px] text-white/60 leading-none">Perpetual</div>
                          </div>
                          <div className="bg-[#2a2a2a] rounded-full text-[10px] font-semibold px-2 py-[2px] text-white/80 select-none">
                            {leverage}x
                          </div>
                        </div>
                      </td>
                      
                      {/* Size */}
                      <td className={`pr-4 text-[13px] font-semibold ${isLong ? 'text-green-500' : 'text-red-500'}`}>
                      {notional.toFixed(2)}
                      </td>
                      
                      {/* Entry Price */}
                      <td className="pr-4 text-[13px] font-normal text-white/80">
                        {entryPrice.toFixed(4)}
                      </td>
                      
                      {/* Mark Price */}
                      <td className="pr-4 text-[13px] font-normal text-white/80">
                        {markPrice.toFixed(4)}
                      </td>
                      
                      {/* Last Price */}
                      <td className="pr-4 text-[13px] font-normal text-white/80">
                        {markPrice.toFixed(4)}
                      </td>
                      
                      {/* Breakeven Price */}
                      <td className="pr-4 text-[13px] font-normal text-white/80">
                        {entryPrice.toFixed(4)}
                      </td>
                      
                      {/* Liquidation Price */}
                      <td className="pr-4 text-[13px] font-normal text-yellow-600 font-semibold">
                        {liquidationPrice > 0 ? liquidationPrice.toFixed(4) : '--'}
                      </td>
                      
                      {/* Margin */}
                      <td className="pr-4 text-[11px] font-normal text-white/80 leading-tight">
                        <div>{margin.toFixed(2)} USDT</div>
                        <div className="text-[9px] text-white/60">({marginType === 'isolated' ? 'Isolated' : 'Cross'})</div>
                      </td>
                      
                      {/* PnL (ROI %) */}
                      <td className={`pr-4 text-[11px] font-semibold leading-tight ${roiPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <div>{unrealizedPnl.toFixed(2)} USDT</div>
                        <div className={`text-[9px] ${roiPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ({roiPercentage >= 0 ? '+' : ''}{roiPercentage.toFixed(2)}%)
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="pr-6">
                        <div className="flex items-center space-x-2 text-yellow-400 text-[13px] font-semibold">
                          <button 
                            onClick={() => closePositionMarket(position.symbol || position.Symbol)}
                            className="hover:underline"
                          >
                            Market
                          </button>
                          <button 
                            onClick={() => closePositionLimit(
                              position.symbol || position.Symbol,
                              positionAmt > 0 ? 'SELL' : 'BUY',
                              position.positionSide || position.PositionSide
                            )}
                            className="hover:underline"
                          >
                            Limit
                          </button>
                          <input
                            type="number"
                            step="0.0001"
                            onWheel={(e) => e.target.blur()} // Prevent scroll from changing value
                            value={limitPriceInputs[position.symbol || position.Symbol] !== undefined ? limitPriceInputs[position.symbol || position.Symbol] : markPrice.toFixed(4)}
                            onChange={(e) => {
                              setLimitPriceInputs(prev => ({
                                ...prev,
                                [position.symbol || position.Symbol]: e.target.value
                              }));
                            }}
                            className="w-20 bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-white text-[13px] focus:outline-none focus:ring-1 focus:ring-yellow-400"
                          />
                          <div className="relative">
                            <input
                              ref={(el) => (quantityInputRefs.current[position.symbol || position.Symbol] = el)}
                              type="number"
                              step="1"
                              onWheel={(e) => e.target.blur()} // Prevent scroll from changing value
                              value={positionSizeInputs[position.symbol || position.Symbol] !== undefined ? positionSizeInputs[position.symbol || position.Symbol] : Math.round(Math.abs(positionAmt)).toString()}
                              onChange={(e) => {
                                setPositionSizeInputs(prev => ({
                                  ...prev,
                                  [position.symbol || position.Symbol]: e.target.value
                                }));
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePositionSizeClick(position.symbol || position.Symbol);
                              }}
                              onFocus={(e) => {
                                handlePositionSizeClick(position.symbol || position.Symbol);
                              }}
                              className="w-24 bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-white text-[13px] focus:outline-none focus:ring-1 
                              focus:ring-yellow-400"
                            />
                          </div>
                          <button 
                            onClick={() => closeAllPositions()}
                            className="hover:underline"
                          >
                            Market All
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                No open positions
              </td>
            </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders Table */}
      {activeTab === 'orders' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[13px] text-gray-500 border-b border-[#333]">
                <th className="w-[12%] px-1 py-1 text-left font-semibold">Symbol</th>
                <th className="w-[12%] px-1 py-1 text-left font-semibold">Size</th>
                <th className="w-[12%] px-1 py-1 text-left font-semibold">Price</th>
                <th className="w-[10%] px-1 py-1 text-left font-semibold">Side</th>
                <th className="w-[12%] px-1 py-1 text-left font-semibold">Type</th>
                <th className="w-[12%] px-1 py-1 text-left font-semibold">Status</th>
                <th className="w-[15%] px-1 py-1 text-left font-semibold">Time</th>
                <th className="w-[10%] px-1 py-1 text-left font-semibold">Filled</th>
                <th className="w-[5%] px-1 py-1 text-left font-semibold">Fee</th>
                <th className="w-[10%] px-1 py-1 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {!exchangeSettings.connected ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Connect to Binance in Settings → Exchange Settings</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-red-400">
                    <div className="flex items-center justify-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>
                        {isRateLimited ? (
                          <span>
                            Rate limit exceeded. Retrying in {retryAfter} seconds...
                          </span>
                        ) : (
                          `Error: ${error}`
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : openOrders.length > 0 ? (
                openOrders.map((order, index) => {
                  // Handle both camelCase and PascalCase from backend
                  const symbol = order.symbol || order.Symbol;
                  const orderId = order.orderId || order.OrderId;
                  const quantity = parseFloat(order.quantity || order.Quantity || 0);
                  const price = parseFloat(order.price || order.Price || 0);
                  const side = order.side || order.Side;
                  const type = order.type || order.Type;
                  const status = order.status || order.Status;
                  const createTime = order.createTime || order.CreateTime;
                  const updateTime = order.updateTime || order.UpdateTime;
                  const executedQuantity = parseFloat(order.executedQuantity || order.ExecutedQuantity || 0);
                  
                  return (
                    <tr key={index} className="hover:bg-[#1a1a1a] transition-colors border-b border-[#222]">
                      <td className="px-1 py-1 font-bold text-yellow-500">
                        {symbol}
                      </td>
                      <td className="px-1 py-1 text-white">
                        {quantity.toFixed(4)}
                      </td>
                      <td className="px-1 py-1 text-white">
                        ${price ? price.toFixed(4) : '--'}
                      </td>
                      <td className={`px-1 py-1 ${
                        side === 'BUY' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {side}
                      </td>
                      <td className="px-1 py-1 text-blue-400">
                        {type}
                      </td>
                      <td className="px-1 py-1 text-orange-400">
                        {status}
                      </td>
                      <td className="px-1 py-1 text-gray-400">
                        {createTime ? new Date(createTime).toLocaleTimeString() : '--'}
                      </td>
                      <td className="px-1 py-1 text-gray-400">
                        {executedQuantity.toFixed(4)}
                      </td>
                      <td className="px-1 py-1 text-gray-400">
                        --
                      </td>
                      <td className="px-1 py-1">
                        <button
                          onClick={() => cancelOrder(symbol, orderId)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded transition-colors"
                          title="Cancel order"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                No open orders
              </td>
            </tr>
          )}
        </tbody>
      </table>
        </div>
      )}

      {/* Fixed Position Quantity Popups - Rendered outside table */}
      {positions.map((position) => {
        const symbol = position.symbol || position.Symbol;
        const positionAmt = parseFloat(position.positionAmt || position.PositionAmt || 0);
        const entryPrice = parseFloat(position.entryPrice || position.EntryPrice || 0);
        // Always use whole numbers
        const currentQty = positionSizeInputs[symbol] || Math.round(Math.abs(positionAmt)).toString();
        const currentQtyNum = Math.round(parseFloat(currentQty) || 0);
        const usdValue = (currentQtyNum * entryPrice).toFixed(2);
        
        return showPercentagePopup[symbol] && popupPosition[symbol] ? (
          <div
            key={`popup-${symbol}`}
            className="quantity-popup fixed bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              top: `${popupPosition[symbol].top}px`,
              left: `${popupPosition[symbol].left}px`,
              zIndex: 9999,
              minWidth: '240px'
            }}
          >
            {/* Position Info Section */}
            <div className="p-3 border-b border-[#333]">
              <div className="text-xs text-gray-400 mb-1.5">
                Position Size: <span className="text-white font-semibold">{Math.round(Math.abs(positionAmt))} {symbol.replace('USDT', '')}</span>
              </div>
              <div className="text-xs text-gray-400">
                Qty: <span className="text-white font-semibold">{currentQtyNum} {symbol.replace('USDT', '')}</span> = <span className="text-yellow-400 font-semibold">{usdValue} USDT</span>
              </div>
            </div>

            {/* Percentage Buttons Section */}
            <div className="p-2">
              <div className="flex flex-wrap gap-1.5">
                {[10, 25, 50, 75, 100].map((percentage) => {
                  // Always round to whole number
                  const size = Math.round(Math.abs(positionAmt) * percentage / 100);
                  const percentUsdValue = (size * entryPrice).toFixed(2);
                  return (
                    <button
                      key={percentage}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePercentageClick(symbol, percentage, Math.abs(positionAmt));
                      }}
                      className="group relative flex-1 min-w-[50px] px-3 py-2 bg-[#1a1a1a] text-white text-xs font-medium rounded hover:bg-[#2a2a2a] transition-colors border border-[#333]"
                    >
                      {percentage === 100 ? 'All' : `${percentage}%`}
                      
                      {/* Hover Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-[#0a0a0a] border border-[#444] rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="text-white">{size} {symbol.replace('USDT', '')}</div>
                        <div className="text-yellow-400">{percentUsdValue} USDT</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#444]"></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null;
      })}
    </div>
  );
};

export default PositionsTable;
