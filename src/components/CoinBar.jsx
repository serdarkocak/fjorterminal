import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import binanceWebSocketManager from '../services/binanceWebSocketManager';

const CoinBar = ({ symbol, name, onTradeClick, onSymbolClick }) => {
  const [priceData, setPriceData] = useState(null);
  const [changePercent4h, setChangePercent4h] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrading, setIsTrading] = useState(false);
  const [coinLogo, setCoinLogo] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const unsubscribeRef = useRef(null);

  // Extract the base symbol (e.g., BTC from BTCUSDT)
  const baseSymbol = symbol ? symbol.replace('USDT', '') : 'UNKNOWN';
  const cleanSymbol = baseSymbol.toLowerCase();
  
  // Validate symbol
  if (!symbol || symbol === 'undefined') {
    console.log('⚠️ CoinBar received invalid symbol:', symbol);
    return null; // Don't render if invalid symbol
  }

  // Coin logo mapping with CORS-friendly URLs
  const coinLogoMap = {
    'btc': 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    'eth': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    'xrp': 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    'ada': 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
    'sol': 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    'dot': 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
    'link': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    'ltc': 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
    'bnb': 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    'doge': 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
    'matic': 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
    'avax': 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    'atom': 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
    'near': 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
    'ftm': 'https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png',
    'algo': 'https://assets.coingecko.com/coins/images/4380/small/download.png',
    'vet': 'https://assets.coingecko.com/coins/images/116/small/VeChain-Logo-768x725.png',
    'fil': 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
    'trx': 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
    'icp': 'https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png',
    'etc': 'https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png',
    'xlm': 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
    'hbar': 'https://assets.coingecko.com/coins/images/2822/small/hbar.png',
    'sand': 'https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.png',
    'mana': 'https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png',
    'axs': 'https://assets.coingecko.com/coins/images/13029/small/axie_infinity_logo.png',
    'gala': 'https://assets.coingecko.com/coins/images/12493/small/GALA-COINGECKO.png',
    'enj': 'https://assets.coingecko.com/coins/images/1102/small/enjin-coin-logo.png',
    'chz': 'https://assets.coingecko.com/coins/images/8834/small/Chiliz.png',
    'flow': 'https://assets.coingecko.com/coins/images/13446/small/5f6294c0c7a8cda55cb1c936_Flow_Wordmark.png'
  };

  // Load coin logo (dynamic approach supporting all coins)
  useEffect(() => {
    const getCoinLogo = async () => {
      try {
        // Check static mapping first (fastest)
        const staticLogo = coinLogoMap[cleanSymbol];
        if (staticLogo) {
          setCoinLogo(staticLogo);
          console.log(`✅ CoinBar static logo found for ${cleanSymbol}:`, staticLogo);
          return;
        }
        
        // If not in static mapping, try CoinGecko API (supports all coins)
        console.log(`🔍 CoinBar searching CoinGecko for ${cleanSymbol}...`);
        
        try {
          // Search for coin by symbol
          const searchResponse = await fetch(`/api/coingecko/search?query=${cleanSymbol}`);
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            
            // Find exact symbol match
            const coinMatch = searchData.coins?.find(coin => 
              coin.symbol?.toLowerCase() === cleanSymbol.toLowerCase()
            );
            
            if (coinMatch && coinMatch.id) {
              // Get detailed coin info with logo
              const coinResponse = await fetch(`/api/coingecko/coins/${coinMatch.id}`);
              if (coinResponse.ok) {
                const coinData = await coinResponse.json();
                const logoUrl = coinData.image?.small || coinData.image?.thumb;
                
                if (logoUrl) {
                  setCoinLogo(logoUrl);
                  console.log(`✅ CoinBar dynamic logo found for ${cleanSymbol}:`, logoUrl);
                } else {
                  console.log(`ℹ️ No logo found in CoinGecko for ${cleanSymbol} in CoinBar`);
                  setCoinLogo(null);
                }
              } else {
                console.log(`ℹ️ CoinGecko API error for ${cleanSymbol} in CoinBar`);
                setCoinLogo(null);
              }
            } else {
              console.log(`ℹ️ Symbol ${cleanSymbol} not found in CoinGecko for CoinBar`);
              setCoinLogo(null);
            }
          } else {
            console.log(`ℹ️ CoinGecko search failed for ${cleanSymbol} in CoinBar`);
            setCoinLogo(null);
          }
        } catch (apiError) {
          console.log(`ℹ️ CoinGecko API error for ${cleanSymbol} in CoinBar:`, apiError.message);
          setCoinLogo(null);
        }
        
      } catch (error) {
        console.warn(`❌ Error setting logo for ${cleanSymbol} in CoinBar:`, error);
        setCoinLogo(null);
      }
    };

    getCoinLogo();
  }, [cleanSymbol]);

  // Subscribe to global Binance WebSocket manager for real-time price updates
  useEffect(() => {
    if (!symbol || symbol === 'undefined' || !baseSymbol || baseSymbol === 'UNKNOWN') {
      return;
    }
    
    // Fetch initial 4h kline data via HTTP (fallback)
    const fetchInitial4hData = async () => {
      try {
        const response = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=4h&limit=2`);
        if (response.ok) {
          const data = await response.json();
          if (data.length >= 2) {
            const lastCandle = data[0];
            const openPrice = parseFloat(lastCandle[1]);
            const closePrice = parseFloat(lastCandle[4]);
            const change = closePrice - openPrice;
            const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;
            setChangePercent4h(changePercent);
          }
        }
      } catch (error) {
        // Silently handle HTTP fetch errors
      }
    };
    
    fetchInitial4hData();
    
    // Subscribe to global WebSocket manager
    const unsubscribe = binanceWebSocketManager.subscribe(baseSymbol, (priceData) => {
      if (priceData) {
        // Update price data
        setPriceData({
          symbol: `$${baseSymbol}`,
          price: priceData.price,
          change: priceData.change24h,
          changePercent: priceData.changePercent24h,
          high24h: priceData.high24h,
          low24h: priceData.low24h,
          volume24h: priceData.volume24h,
          lastUpdated: priceData.lastUpdate
        });
        
        // Update 4h change if available
        if (priceData.changePercent4h !== undefined) {
          setChangePercent4h(priceData.changePercent4h);
        }
        
        setIsLoading(false);
        setIsConnected(true);
      }
    });
    
    unsubscribeRef.current = unsubscribe;
    
    // Check connection state
    setIsConnected(binanceWebSocketManager.isConnected());
    
    // Check connection state periodically
    const connectionCheckInterval = setInterval(() => {
      setIsConnected(binanceWebSocketManager.isConnected());
    }, 1000);
    
    // Cleanup on unmount or symbol change
    return () => {
      clearInterval(connectionCheckInterval);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [symbol, baseSymbol]);

  const handleTradeClick = async (action) => {
    if (!onTradeClick) return;
    
    // Use custom amount if provided, otherwise use a default
    const amount = customAmount || '1000';
    const numericAmount = parseFloat(amount);
    
    // Check minimum notional value (5 USD for Binance)
    if (numericAmount < 5) {
      alert(`❌ Minimum order amount is $5 USD\n\nYou entered: $${numericAmount}\nPlease enter at least $5 USD to place an order.`);
      return;
    }
    
    setIsTrading(true);
    try {
      await onTradeClick(symbol, action, amount);
    } finally {
      // Reset trading state after a short delay
      setTimeout(() => setIsTrading(false), 1000);
    }
  };

  const handleSymbolClick = () => {
    if (onSymbolClick) {
      // Convert symbol to BINANCE format for TradingView
      const binanceSymbol = symbol.startsWith('BINANCE:') ? symbol : `BINANCE:${symbol}`;
      onSymbolClick(binanceSymbol);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    
    if (price >= 10000) {
      return price.toFixed(2);  // $10,000+ → 2 decimals
    } else if (price >= 1000) {
      return price.toFixed(2);  // $1,000+ → 2 decimals
    } else if (price >= 100) {
      return price.toFixed(2);  // $100+ → 2 decimals
    } else if (price >= 1) {
      return price.toFixed(4);  // $1-99 → 4 decimals
    } else if (price >= 0.01) {
      return price.toFixed(4);  // $0.01+ → 4 decimals
    } else {
      return price.toFixed(6);  // Very small prices
    }
  };

  const formatChangePercent = (changePercent) => {
    if (changePercent === null || changePercent === undefined) return 'N/A';
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const isPositive = changePercent4h !== null ? changePercent4h >= 0 : (priceData?.changePercent >= 0);

  return (
    <div className="flex items-center gap-3 px-4 py-2 max-w-full overflow-x-auto bg-black">
      {/* Coin Logo and Symbol - Clickable */}
      <button 
        onClick={handleSymbolClick}
        className="flex items-center gap-2 text-white font-semibold text-sm font-[Inter] flex-shrink-0 hover:text-yellow-400 transition-colors cursor-pointer"
        title={`View ${baseSymbol} chart`}
      >
        {coinLogo ? (
          <img 
            alt={`${baseSymbol} logo`} 
            className="w-5 h-5" 
            src={coinLogo}
            onError={(e) => {
              // Silently fallback to placeholder
              e.target.src = `https://placehold.co/20x20/ffffff/000000?text=${baseSymbol?.charAt(0) || '?'}`;
            }}
          />
        ) : (
          <img 
            alt={`${baseSymbol} logo`} 
            className="w-5 h-5" 
            src={`https://placehold.co/20x20/ffffff/000000?text=${baseSymbol?.charAt(0) || '?'}`}
          />
        )}
        ${baseSymbol && baseSymbol !== 'UNKNOWN' ? baseSymbol : 'UNKNOWN'}
      </button>

      {/* 1h Change Percentage */}
      <div className={`flex items-center text-xs font-semibold rounded-md px-2 py-[2px] flex-shrink-0 ${
        isPositive 
          ? 'text-green-600 bg-[#0f2a17]' 
          : 'text-red-600 bg-[#3a0a0a]'
      }`}>
        4h: {isLoading ? '---' : changePercent4h !== null ? formatChangePercent(changePercent4h) : '---'}
      </div>

      {/* Price with Chart Icon */}
      <div className="flex items-center text-white font-semibold text-sm font-[Inter] flex-shrink-0">
        {isLoading ? (
          <span className="flex items-center">
            <Loader2 className="w-3 h-3 animate-spin mr-2" />
            Loading...
          </span>
        ) : priceData ? (
          <>
            ${formatPrice(priceData.price)}
            <i className="fas fa-chart-line ml-2 text-white text-xs"></i>
          </>
        ) : (
          'N/A'
        )}
      </div>

      {/* Custom Amount Input */}
      <input
        type="number"
        value={customAmount}
        onChange={(e) => setCustomAmount(e.target.value)}
        onWheel={(e) => e.target.blur()} // Prevent scroll from changing value
        placeholder="Min $5"
        className="w-20 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        min="5"
        step="0.01"
      />

      {/* Long Button */}
      <button
        onClick={() => handleTradeClick('BUY')}
        disabled={isTrading || isLoading || !customAmount || parseFloat(customAmount || 0) < 5}
        className="text-xs font-semibold text-green-300 bg-[#0f2a17] rounded-md px-3 py-1 flex-shrink-0 hover:bg-[#0f3a1f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={parseFloat(customAmount || 0) < 5 ? "Minimum amount is $5 USD" : ""}
      >
        {isTrading ? 'Opening...' : 'LONG'}
      </button>

      {/* Short Button */}
      <button
        onClick={() => handleTradeClick('SELL')}
        disabled={isTrading || isLoading || !customAmount || parseFloat(customAmount || 0) < 5}
        className="text-xs font-semibold text-red-600 bg-[#3a0a0a] rounded-md px-3 py-1 flex-shrink-0 hover:bg-[#4a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={parseFloat(customAmount || 0) < 5 ? "Minimum amount is $5 USD" : ""}
      >
        {isTrading ? 'Opening...' : 'SHORT'}
      </button>
    </div>
  );
};

export default CoinBar;
