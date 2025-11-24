import React, { useState, useEffect, memo } from 'react';
import { TrendingUp } from 'lucide-react';

const TickerCard = memo(({ 
  symbol, 
  price, 
  change, 
  changePercent, 
  changePercent4h,
  icon, 
  iconColor, 
  buyAmounts = ['10', '50', '100'], 
  sellAmounts = ['10', '50', '100'],
  isLoading = false,
  isStale = false,
  lastUpdated = null,
  onChartClick = null,
  onBuyClick = null,
  onSellClick = null,
  isConnected = false
}) => {
  // Use 4h change if available, fallback to 24h change
  const displayChangePercent = changePercent4h !== null && changePercent4h !== undefined 
    ? changePercent4h 
    : changePercent;
  const isPositive = displayChangePercent > 0;
  const [coinLogo, setCoinLogo] = useState(null);
  const [logoLoading, setLogoLoading] = useState(true);

  // Get clean symbol (remove $ prefix)
  const cleanSymbol = symbol.replace('$', '').toLowerCase();
  
  // Smart price formatting
  const formatPrice = (price) => {
    if (!price) return '0.00';
    
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
 
  // Get coin logo URL (dynamic approach supporting all coins)
  useEffect(() => {
    const getCoinLogo = async () => {
      try {
        setLogoLoading(true);
        
        // Static mapping for most common coins (fastest)
        const staticCoinLogoMap = {
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
        
        // Check static mapping first (fastest)
        const staticLogo = staticCoinLogoMap[cleanSymbol.toLowerCase()];
        if (staticLogo) {
          setCoinLogo(staticLogo);
          console.log(`✅ Static logo found for ${cleanSymbol}:`, staticLogo);
          setLogoLoading(false);
          return;
        }
        
        // If not in static mapping, try CoinGecko API (supports all coins)
        console.log(`🔍 Searching CoinGecko for ${cleanSymbol}...`);
        
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
                  console.log(`✅ Dynamic logo found for ${cleanSymbol}:`, logoUrl);
                } else {
                  console.log(`ℹ️ No logo found in CoinGecko for ${cleanSymbol}`);
                  setCoinLogo(null);
                }
              } else {
                console.log(`ℹ️ CoinGecko API error for ${cleanSymbol}`);
                setCoinLogo(null);
              }
            } else {
              console.log(`ℹ️ Symbol ${cleanSymbol} not found in CoinGecko`);
              setCoinLogo(null);
            }
          } else {
            console.log(`ℹ️ CoinGecko search failed for ${cleanSymbol}`);
            setCoinLogo(null);
          }
        } catch (apiError) {
          console.log(`ℹ️ CoinGecko API error for ${cleanSymbol}:`, apiError.message);
          setCoinLogo(null);
        }
        
      } catch (error) {
        console.warn(`❌ Error setting logo for ${cleanSymbol}:`, error);
        setCoinLogo(null);
      } finally {
        setLogoLoading(false);
      }
    };

    getCoinLogo();
  }, [cleanSymbol]);
  
  return (
    <div className={`w-[300px] min-w-[300px] max-w-[300px] space-y-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3 transition-all duration-300 ${
      isStale ? 'opacity-100' : ''
    } ${isLoading ? 'opacity-70' : ''}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center space-x-2">
          {logoLoading ? (
            <div className="w-5 h-5 bg-white/20 rounded-full animate-pulse"></div>
          ) : coinLogo ? (
            <img 
              alt={`${symbol} logo`} 
              className="w-5 h-5" 
              src={coinLogo}
              onError={(e) => {
                e.target.src = `https://placehold.co/20x20/png/ffffff/000000?text=${symbol.charAt(1)}`;
              }}
            />
          ) : (
            <img 
              alt={`${symbol} logo`} 
              className="w-5 h-5" 
              src={`https://placehold.co/20x20/png/ffffff/000000?text=${symbol.charAt(1)}`}
            />
          )}
          <button
            onClick={() => onChartClick && onChartClick(symbol)}
            className="font-semibold text-sm hover:text-yellow-400 transition-colors cursor-pointer"
            title={`View ${symbol} chart`}
          >
            {symbol}
          </button>
          <div className={`ml-3 text-xs font-medium rounded-full px-3 py-[2px] ${
            isPositive ? 'text-[#10B981] bg-[#10B981]/10' : 'text-[#EF4444] bg-[#EF4444]/10'
          } ${isLoading ? 'opacity-50' : ''}`}>
            4h: 
            <span className={isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}>
              {isLoading ? '---' : `${isPositive ? '+' : ''}${displayChangePercent.toFixed(3)}%`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 font-semibold text-white text-sm">
          <span className={isLoading ? 'text-white/50' : ''}>
            {isLoading ? (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-xs">Loading...</span>
              </div>
            ) : (
              `$${formatPrice(price)}`
            )}
          </span>
          <i className="fas fa-chart-line text-white text-base"></i>
        </div>
      </div>
      
      {/* Buy Buttons Grid */}
      <div className="grid grid-cols-3 gap-1">
        {buyAmounts.map((amount, index) => (
          <button 
            key={`buy-${index}`}
            onClick={() => onBuyClick && onBuyClick(symbol, amount)}
            disabled={!isConnected || isLoading}
            className={`ticker-button ticker-button-buy ${!isConnected || isLoading ? 'disabled' : ''}`}
            title={!isConnected ? 'Connect to Binance first' : `Buy ${symbol} for $${amount}`}
          >
            ${amount}
          </button>
        ))}
      </div>
      
      {/* Sell Buttons Grid */}
      <div className="grid grid-cols-3 gap-1">
        {sellAmounts.map((amount, index) => (
          <button 
            key={`sell-${index}`}
            onClick={() => onSellClick && onSellClick(symbol, amount)}
            disabled={!isConnected || isLoading}
            className={`ticker-button ticker-button-sell ${!isConnected || isLoading ? 'disabled' : ''}`}
            title={!isConnected ? 'Connect to Binance first' : `Sell ${symbol} for $${amount}`}
          >
            ${amount}
          </button>
        ))}
      </div>
    </div>
  );
});

TickerCard.displayName = 'TickerCard';

export default TickerCard;
