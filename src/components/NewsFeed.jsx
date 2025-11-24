import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Newspaper, RefreshCw, Wifi, WifiOff, Clock, AlertCircle, Type, ChevronDown } from 'lucide-react';
import useNewsFeed from '../hooks/useNewsFeed';
import CoinBar from './CoinBar';
import { translateNewsItems } from '../services/translationService';
import { detectCoinFromNews } from '../utils/smartDetector';
import { loadBinanceFuturesCoins } from '../services/binanceFuturesService';
import logger from '../utils/logger';

// Stabil ID helper - haber nesnelerinde stabil bir id oluşturur
function makeStableId(news) {
  if (news.id) return news.id;
  return (news.title + "|" + news.description).replace(/\s+/g, "_");
}

// Tüm haberleri analiz eden fonksiyon (Smart Detection - milisaniyeler içinde)
function analyzeAllNews(newsList, coinMap, setCoinMap, futuresBases) {
  if (!newsList || newsList.length === 0 || futuresBases.size === 0) return;

  newsList.forEach(news => {
    const stableId = makeStableId(news);
    
    // Zaten analiz edilmişse tekrar analiz etme
    if (coinMap[stableId] !== undefined) return;

    try {
      // Smart Detection - ultra hızlı, deterministik
      const coin = detectCoinFromNews(news.title, news.description, futuresBases);
      
      setCoinMap(prev => {
        // Bu arada başka bir işlem yazmışsa tekrar yazma
        if (prev[stableId] !== undefined) return prev;

        return {
          ...prev,
          [stableId]: coin !== "NONE" ? coin : null
        };
      });
    } catch (err) {
      // Hata durumunda null olarak işaretle
      setCoinMap(prev => {
        if (prev[stableId] !== undefined) return prev;
        return { ...prev, [stableId]: null };
      });
    }
  });
}

const NewsItem = ({ news, onTradeClick, onSymbolClick, onTranslateClick, coin }) => {
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 60) {
        return `${minutes}m ago`;
      } else if (hours < 24) {
        return `${hours}h ago`;
      } else {
        return `${days}d ago`;
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  const getSourceLogo = (sourceId) => {
    // Returns logo URLs for news sources (using favicons/icons)
    switch (sourceId) {
      case 'coindesk':
        return 'https://www.coindesk.com/favicons/production/favicon.ico';
      case 'coinkolik':
        return 'https://www.coinkolik.com/wp-content/uploads/2021/03/identity-410x410.png';
      case 'uzmancoin':
        return 'https://uzmancoin.com/wp-content/uploads/2021/01/cropped-iconn-32x32.png';
      case 'cointelegraph':
        return 'https://cointelegraph.com/favicon.ico';
      case 'financefeeds':
        return 'https://cdn-iledkkd.nitrocdn.com/JgVqWxjBXAxXZqxnJHbtcSOOAHYjFqOB/assets/images/optimized/rev-a46e4d5/financefeeds.com/wp-content/uploads/2024/06/cropped-FF-logo-favicon-32x32.png';
      case 'politico':
        return 'https://www.politico.com/favicon.ico?v=2';
      case 'forbes':
        return 'https://i.forbesimg.com/48X48-F.png';
      case 'dlnews':
        return 'https://www.dlnews.com/pf/resources/favicon-light.svg?d=803';
        case 'ninjanews':
          return 'https://beta.ninjanews.io/favicon-16x16.png'
        case 'theblock':
          return 'https://www.theblock.co/favicon.ico'
        case 'decrypt':
          return 'https://cdn.decrypt.co/wp-content/themes/decrypt-media/assets/images/favicon-32x32.png'

      default:
        return null;
    }
  };

  // Coin detection is now done via LLaMA in the parent component
  // coin is passed as a prop from coinMap
  // coin = undefined → analiz devam ediyor
  // coin = null → NONE (analiz edildi ama coinbar gösterme)
  // coin = "BTC" | "ETH" ... → coinbar göster

  return (
    <div className="border-b border-[#222] pb-4 mb-4">
      {/* News Content */}
      <article className="text-[14px] leading-relaxed select-text">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-gray-400">
            {getSourceLogo(news.sourceId) ? (
              <img 
                src={getSourceLogo(news.sourceId)} 
                alt={news.source}
                className="h-5 w-auto max-w-[100px] object-contain brightness-90 hover:brightness-100 transition-all"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-xs">📄</span>
            )}
            <span className="text-xs font-medium text-gray-300">{news.source}</span>
            <span className="text-xs px-1 py-0.5 bg-[#333] rounded text-gray-300">
              {news.category}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {/* TR Translation Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onTranslateClick) {
                  onTranslateClick(news.id);
                }
              }}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors border ${
                news.translatedTitle ? 'bg-green-600 text-white border-green-500' : 'bg-blue-600 text-white border-blue-500'
              }`}
              title={news.translatedTitle ? 'Already translated' : 'Translate to Turkish'}
              style={{ minWidth: '24px', minHeight: '20px' }}
            >
              TR
            </button>
            <span className="text-xs text-gray-500">
              {formatDate(news.pubDate)}
            </span>
          </div>
        </div>
        
        {/* Clickable Title - External Link */}
        <div 
          className="font-bold text-[15px] mb-2 text-gray-200 hover:text-white transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (news.link) {
              window.open(news.link, '_blank', 'noopener,noreferrer');
            }
          }}
        >
          {news.title}
        </div>
        
        {/* Turkish Translation for Title */}
        {news.translatedTitle && news.translatedTitle !== news.title && (
          <div className="text-[12px] text-gray-500 mb-2 italic">
            {news.translatedTitle}
          </div>
        )}
        
        {news.description && news.description.trim().length > 0 && (
          <div className="text-[12px] text-gray-400 mb-2">
            {news.description}
          </div>
        )}
        
        {/* Turkish Translation for Description */}
        {news.translatedDescription && news.translatedDescription !== news.description && news.translatedDescription.trim().length > 0 && (
          <div className="text-[11px] text-gray-500 mb-3 italic">
            {news.translatedDescription}
          </div>
        )}
      </article>

      {/* Coin Bar - Only show if crypto is actually detected by Smart Detection */}
      {coin && (
        <CoinBar 
          symbol={`${coin}USDT`}
          name={coin}
          onTradeClick={(symbol, action, amount) => {
            if (onTradeClick) {
              // Convert amount to number for trading
              const numericAmount = parseFloat(amount);
              onTradeClick(symbol, action, numericAmount);
            }
          }}
          onSymbolClick={onSymbolClick}
        />
      )}
    </div>
  );
};

const NewsFeed = ({ onTradeClick, onSymbolClick }) => {
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [translatedNews, setTranslatedNews] = useState([]);
  const [coinMap, setCoinMap] = useState({}); // { [stableId]: "BTC" | "ETH" | null }
  const [isTranslating, setIsTranslating] = useState(false);
  const [futuresBases, setFuturesBases] = useState(new Set()); // Binance Futures base assets
  const [translationMap, setTranslationMap] = useState({}); // { [newsId]: { translatedTitle, translatedDescription } }
  const [timeFilter, setTimeFilter] = useState(24); // Hours filter: 1, 3, 6, 12, 24
  const [showTimeFilter, setShowTimeFilter] = useState(false); // Dropdown visibility
  
  const {
    newsData,
    isLoading,
    error,
    isConnected,
    isStale,
    lastUpdate,
    successCount,
    errorCount,
    refreshNews,
    getLastUpdateString,
    getConnectionStatus,
    totalItems
  } = useNewsFeed(autoUpdate ? 15000 : 0); // 15 seconds if auto-update enabled

  // Load Binance Futures base assets on mount
  useEffect(() => {
    async function fetchBases() {
      try {
        logger.info('🔄 Loading Binance Futures base assets...');
        const { coinsMap } = await loadBinanceFuturesCoins();
        const bases = new Set(Array.from(coinsMap.values()).map(coin => coin.baseAsset));
        setFuturesBases(bases);
        logger.info(`✅ Loaded ${bases.size} Binance Futures base assets`);
      } catch (error) {
        logger.error('❌ Failed to load Binance Futures base assets:', error);
        // Fallback to empty set
        setFuturesBases(new Set());
      }
    }
    fetchBases();
  }, []);

  // Initialize translated news with original data, preserving existing translations
  useEffect(() => {
    if (!newsData || newsData.length === 0) {
      setTranslatedNews([]);
      return;
    }

    // Merge new news data with existing translations
    const mergedNews = newsData.map(news => {
      const existingTranslation = translationMap[news.id];
      if (existingTranslation) {
        // Eğer bu haber daha önce çevrilmişse, çevirileri koru
        return {
          ...news,
          translatedTitle: existingTranslation.translatedTitle,
          translatedDescription: existingTranslation.translatedDescription
        };
      }
      // Yeni haber veya çevrilmemiş haber
      return news;
    });

    setTranslatedNews(mergedNews);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsData]); // translationMap'i dependency'den çıkarıyoruz (sonsuz döngüyü önlemek için, ama içeride kullanıyoruz)

  // Otomatik analiz - translatedNews ve futuresBases hazır olduğunda tüm haberleri analiz et
  useEffect(() => {
    if (!translatedNews || translatedNews.length === 0) return;
    if (futuresBases.size === 0) return; // Futures bases yüklenene kadar bekle

    logger.info(`🔍 Auto-analyzing ${translatedNews.length} news items with Smart Detection...`);
    analyzeAllNews(translatedNews, coinMap, setCoinMap, futuresBases);
    logger.info('✅ Auto-analysis completed');
  }, [translatedNews, futuresBases]); // Haber listesi veya futures bases değiştiğinde çalışır

  // Translate single news item
  const translateSingleNewsItem = async (newsId) => {
    try {
      setIsTranslating(true);
      
      const newsItem = translatedNews.find(item => item.id === newsId);
      if (!newsItem) return;

      // Eğer zaten çevrilmişse, tekrar çevirme
      if (translationMap[newsId]) {
        logger.info('ℹ️ News item already translated, skipping...');
        setIsTranslating(false);
        return;
      }

      logger.info('🔄 Translating single news item:', newsItem.title.substring(0, 50) + '...');
      
      const translated = await translateNewsItems([newsItem]);
      if (translated.length > 0 && translated[0].translatedTitle) {
        const translation = {
          translatedTitle: translated[0].translatedTitle,
          translatedDescription: translated[0].translatedDescription
        };

        // Çeviriyi translationMap'e kaydet (kalıcı olması için)
        setTranslationMap(prev => ({
          ...prev,
          [newsId]: translation
        }));

        // translatedNews'i de güncelle
        const updatedNews = translatedNews.map(item => 
          item.id === newsId ? { ...item, ...translation } : item
        );
        setTranslatedNews(updatedNews);
        
        logger.info('✅ Single news item translated successfully and saved');
      }
      
    } catch (error) {
      logger.error('❌ Single news item translation failed', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const connectionStatus = getConnectionStatus();
  
  // Filter news by date (dynamic time filter)
  const timeFilterAgo = new Date();
  timeFilterAgo.setHours(timeFilterAgo.getHours() - timeFilter);
  
  const recentNews = translatedNews.filter(item => {
    try {
      const newsDate = new Date(item.pubDate);
      return newsDate >= timeFilterAgo;
    } catch (error) {
      // If date parsing fails, keep the item
      return true;
    }
  });

  // Time filter options
  const timeFilterOptions = [
    { value: 1, label: '1 hour' },
    { value: 3, label: '3 hours' },
    { value: 6, label: '6 hours' },
    { value: 12, label: '12 hours' },
    { value: 24, label: '24 hours' }
  ];

  return (
    <section className="flex flex-col bg-[#0f0f0f] border border-[#222] rounded-sm p-2 h-[700px]">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#333] flex-shrink-0">
        <div className="flex items-center space-x-2">
          <h2 className="text-[12px] font-bold text-gray-200 select-text">
            Real-time News Feed
          </h2>
          {Object.keys(coinMap).length > 0 && (
            <span className="text-[10px] text-green-400" title={`${Object.values(coinMap).filter(c => c).length} coins detected`}>
              ✅ {Object.values(coinMap).filter(c => c).length} coins detected
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Time Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTimeFilter(!showTimeFilter)}
              className="flex items-center space-x-1 px-2 py-1 text-[10px] bg-[#333] hover:bg-[#444] text-gray-300 rounded transition-colors"
              title={`Show news from last ${timeFilter} hour(s)`}
            >
              <Clock className="w-3 h-3" />
              <span>{timeFilter}h</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showTimeFilter ? 'rotate-180' : ''}`} />
            </button>
            
            {showTimeFilter && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowTimeFilter(false)}
                ></div>
                <div className="absolute right-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded shadow-lg z-20 min-w-[120px]">
                  {timeFilterOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimeFilter(option.value);
                        setShowTimeFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-[11px] transition-colors ${
                        timeFilter === option.value
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-[#333]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-1" title={connectionStatus.message}>
            {connectionStatus.status === 'connected' ? (
              <Wifi className="w-3 h-3 text-green-400" />
            ) : connectionStatus.status === 'partial' ? (
              <AlertCircle className="w-3 h-3 text-yellow-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-400" />
            )}
          </div>
          
          
          {/* Refresh Button */}
          <button
            onClick={refreshNews}
            disabled={isLoading}
            className="p-1 hover:bg-[#333] rounded transition-colors disabled:opacity-50"
            title="Refresh news"
          >
            <RefreshCw className={`w-3 h-3 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Auto Update Toggle */}
          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            className={`p-1 rounded transition-colors ${
              autoUpdate ? 'bg-green-600 text-white' : 'bg-[#333] text-gray-400'
            }`}
            title={autoUpdate ? 'Disable auto-update (15s)' : 'Enable auto-update (15s)'}
          >
            <Clock className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Status Bar - Fixed */}
      <div className="flex items-center justify-between mb-3 text-[10px] text-gray-500 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span>{recentNews.length} items</span>
          <span className="text-gray-400">• Last {timeFilter}h</span>
          {successCount > 0 && <span className="text-green-400">• {successCount} sources</span>}
          {errorCount > 0 && <span className="text-red-400">• {errorCount} failed</span>}
          {isStale && <span className="text-yellow-400">• Stale data</span>}
          {error && <span className="text-red-400">• Error</span>}
          {isTranslating && <span className="text-blue-400">• Translating...</span>}
        </div>
        <span>Updated: {getLastUpdateString()}</span>
      </div>

      {/* News Content - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
        {isLoading && newsData.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-400 text-xs">Loading news...</span>
            </div>
          </div>
        ) : error && newsData.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-red-400 text-sm font-semibold mb-1">Error Loading News</div>
              <div className="text-gray-400 text-xs mb-2">{error}</div>
              <button
                onClick={refreshNews}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : recentNews.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-400 text-sm">No news available</div>
          </div>
        ) : (
          <div className="space-y-0">
            {recentNews.map((news) => {
              const stableId = makeStableId(news);
              return (
                <NewsItem 
                  key={news.id || stableId} 
                  news={news} 
                  coin={coinMap[stableId]}
                  onTradeClick={onTradeClick}
                  onSymbolClick={onSymbolClick}
                  onTranslateClick={translateSingleNewsItem}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsFeed;
