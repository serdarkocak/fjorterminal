import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Wifi, WifiOff, Play, Pause } from 'lucide-react';
import TickerCard from './TickerCard';
import { useBinanceWebSocket } from '../hooks/useBinanceWebSocket';
import { TickerCardSkeleton } from './SkeletonLoader';
import { NoTickersState } from './EmptyState';

const TickerSection = ({ onSymbolSelect = null, tickerShortcuts = [], positionSettings = {}, exchangeSettings = {}, onTradeExecute = null, walletData = {} }) => {
  const [autoUpdate, setAutoUpdate] = useState(true);
  
  // Memoize symbols to prevent unnecessary re-renders
  const currentSymbols = useMemo(() => {
    return tickerShortcuts.map(coin => coin.baseAsset);
  }, [tickerShortcuts]);
  
  // Use Binance Futures WebSocket for real-time price updates
  const { 
    prices, 
    isConnected, 
    error
  } = useBinanceWebSocket(currentSymbols);
  
  
  // Loading state based on connection and data availability
  const loading = !isConnected && Object.keys(prices).length === 0;
  const isStale = false; // WebSocket data is always fresh
  
  // Debug logs (disabled for production)
  // useEffect(() => {
  //   console.log('📊 TickerSection - Symbols:', currentSymbols);
  // }, [currentSymbols]);
  
  // useEffect(() => {
  //   if (Object.keys(prices).length > 0) {
  //     console.log('💰 Real-time Prices:', prices);
  //   }
  // }, [prices]);

  // Dynamic ticker configuration with position settings
  const getTickerConfig = (symbol) => {
    const defaultConfig = {
      iconColor: 'blue',
      buyAmounts: ['10', '50', '100'],
      sellAmounts: ['10', '50', '100']
    };

    const baseConfig = defaultConfig;
    
    // Override with position settings if available
    if (positionSettings[symbol]) {
      const settings = positionSettings[symbol];
      const formatAmounts = (amounts) => {
        return amounts.map(amount => {
          const num = parseFloat(amount);
          if (num >= 1000000) {
            return `${(num / 1000000).toFixed(2)}M`;
          } else if (num >= 1000) {
            return `${(num / 1000).toFixed(2)}K`;
          } else {
            return amount;
          }
        });
      };

      return {
        ...baseConfig,
        buyAmounts: formatAmounts(settings.sizePresets || baseConfig.buyAmounts),
        sellAmounts: formatAmounts(settings.sizePresets || baseConfig.sellAmounts)
      };
    }

    return baseConfig;
  };

  // Convert prices object to array for rendering
  const tickerData = currentSymbols.map(symbol => {
    const priceData = prices[symbol];
    const config = getTickerConfig(symbol);
    
    return {
      symbol: `$${symbol}`,
      price: priceData?.price || 0,
      change: priceData?.change24h || 0,
      changePercent: priceData?.changePercent24h || 0,
      changePercent4h: priceData?.changePercent4h || null,
      iconColor: config.iconColor,
      buyAmounts: config.buyAmounts,
      sellAmounts: config.sellAmounts,
      isLoading: loading,
      isStale: isStale,
      lastUpdated: priceData?.lastUpdate
    };
  });

  // Handle chart click
  const handleChartClick = (symbol) => {
    if (onSymbolSelect) {
      // Convert $BTC to BINANCE:BTCUSDT format
      const cleanSymbol = symbol.replace('$', '');
      const chartSymbol = `BINANCE:${cleanSymbol}USDT`;
      onSymbolSelect(chartSymbol);
    }
  };


  // Handle buy button click (LONG position)
  const handleBuyClick = (symbol, amount) => {
    if (!exchangeSettings.connected) {
      alert('Please connect to Binance first in Settings → Exchange Settings');
      return;
    }

    const cleanSymbol = symbol.replace('$', '');
    const tradingPair = `${cleanSymbol}USDT`;
    
    // Get current price for this symbol
    const priceData = prices[cleanSymbol];
    if (!priceData || !priceData.price) {
      alert('Unable to get current price for this symbol');
      return;
    }
    
    // Convert amount string to USD value
    let usdAmount = parseFloat(amount.replace(/[KM]/g, ''));
    if (amount.includes('K')) usdAmount *= 1000;
    if (amount.includes('M')) usdAmount *= 1000000;
    
    // Calculate coin quantity based on USD amount and current price
    const coinQuantity = (usdAmount / parseFloat(priceData.price)).toFixed(8);
    const notionalValue = parseFloat(coinQuantity) * parseFloat(priceData.price);
    
    // Check minimum notional value (5 USD for Binance Futures)
    if (notionalValue < 5) {
      alert(`❌ Minimum order value is $5 USD\n\nYour order value: $${notionalValue.toFixed(2)}\nPlease increase the amount.`);
      return;
    }
    
    if (onTradeExecute) {
      onTradeExecute({
        symbol: tradingPair,
        side: 'BUY',
        type: 'MARKET',
        quantity: coinQuantity,
        amount: amount,
        positionSide: 'LONG'
      });
    }
  };

  // Handle sell button click (SHORT position)
  const handleSellClick = (symbol, amount) => {
    if (!exchangeSettings.connected) {
      alert('Please connect to Binance first in Settings → Exchange Settings');
      return;
    }

    const cleanSymbol = symbol.replace('$', '');
    const tradingPair = `${cleanSymbol}USDT`;
    
    // Get current price for this symbol
    const priceData = prices[cleanSymbol];
    if (!priceData || !priceData.price) {
      alert('Unable to get current price for this symbol');
      return;
    }
    
    // Convert amount string to USD value
    let usdAmount = parseFloat(amount.replace(/[KM]/g, ''));
    if (amount.includes('K')) usdAmount *= 1000;
    if (amount.includes('M')) usdAmount *= 1000000;
    
    // Calculate coin quantity based on USD amount and current price
    const coinQuantity = (usdAmount / parseFloat(priceData.price)).toFixed(8);
    const notionalValue = parseFloat(coinQuantity) * parseFloat(priceData.price);
    
    // Check minimum notional value (5 USD for Binance Futures)
    if (notionalValue < 5) {
      alert(`❌ Minimum order value is $5 USD\n\nYour order value: $${notionalValue.toFixed(2)}\nPlease increase the amount.`);
      return;
    }
    
    if (onTradeExecute) {
      onTradeExecute({
        symbol: tradingPair,
        side: 'SELL',
        type: 'MARKET',
        quantity: coinQuantity,
        amount: amount,
        positionSide: 'SHORT'
      });
    }
  };

  return (
    <div className="bg-[#121212] border border-t-0 border-[#222222]">
   
      {/* Ticker cards */}
      <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3 p-2 md:p-3 text-[10px] md:text-xs">
      {loading ? (
        // Show skeleton loaders while connecting
        <>
          {[...Array(Math.min(currentSymbols.length || 5, 8))].map((_, i) => (
            <div key={i} className="flex-1 min-w-[200px]">
              <TickerCardSkeleton />
            </div>
          ))}
        </>
      ) : tickerData.length > 0 ? (
        tickerData.map((ticker, index) => (
          <TickerCard
              key={ticker.symbol}
            symbol={ticker.symbol}
            price={ticker.price}
            change={ticker.change}
            changePercent={ticker.changePercent}
              changePercent4h={ticker.changePercent4h}
            iconColor={ticker.iconColor}
            buyAmounts={ticker.buyAmounts}
            sellAmounts={ticker.sellAmounts}
              isLoading={ticker.isLoading}
              isStale={ticker.isStale}
              lastUpdated={ticker.lastUpdated}
              onChartClick={handleChartClick}
              onBuyClick={handleBuyClick}
              onSellClick={handleSellClick}
              isConnected={exchangeSettings.connected || false}
          />
        ))
      ) : (
        // Empty state - No tickers configured
        <div className="flex-1 w-full">
          <NoTickersState />
        </div>
      )}
      </div>

    </div>
  );
};

export default TickerSection;
