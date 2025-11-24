import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, RefreshCw, Wifi, WifiOff, Clock, Filter, AlertCircle, Type } from 'lucide-react';
import useNewsFeed from '../hooks/useNewsFeed';
import { translateNewsItems } from '../services/translationService';
import { detectCoinFromNews } from '../utils/smartDetector';
import { loadBinanceFuturesCoins } from '../services/binanceFuturesService';
import { NewsCardSkeleton } from './SkeletonLoader';
import { NoNewsState, ErrorState } from './EmptyState';

// Stabil ID helper - haber nesnelerinde stabil bir id oluşturur
function makeStableId(news) {
  if (news.id) return news.id;
  return (news.title + "|" + news.description).replace(/\s+/g, "_");
}

/**
 * Smart Detection ile Haber Analizi (Ultra Hızlı - Milisaniyeler İçinde)
 * newsList: { stableId, title, description, ... } içeren array
 * coinMap: mevcut coin sonuçları (id → coin/null)
 * setCoinMap: React state setter
 * futuresBases: Binance Futures base assets Set
 */
function analyzeNewsQueue(newsList, coinMap, setCoinMap, futuresBases) {
  // ZATEN ANALİZ EDİLMİŞ OLANLARI ATLA
  const queue = newsList.filter(n => coinMap[n.stableId] === undefined);

  if (queue.length === 0) return;

  // Smart Detection - tüm haberleri anında analiz et (async değil, senkron)
  queue.forEach(news => {
    // Aynı haberi tekrar analiz etmesini engelle
    if (coinMap[news.stableId] && coinMap[news.stableId] !== "NONE" && coinMap[news.stableId] !== null) {
      return; // Zaten analiz edilmiş ve coin bulunmuş, atla
    }

    // Smart Detection - milisaniyeler içinde
    const coin = detectCoinFromNews(news.title, news.description, futuresBases);

    setCoinMap(prev => {
      // Bu arada başka bir işlem yazmışsa tekrar yazma
      if (prev[news.stableId] !== undefined) return prev;

      return {
        ...prev,
        [news.stableId]: coin !== "NONE" ? coin : null
      };
    });
  });
}

const NewsItem = ({ news, onCoinClick, coin }) => {
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

  const getSourceIcon = (sourceId) => {
    switch (sourceId) {
      case 'coindesk':
        return '📰';
      case 'coinkolik':
        return '💰';
      case 'uzmancoin':
        return '🔍';
      default:
        return '📄';
    }
  };

  // Coin detection is now done via Smart Detection in the parent component
  // coin is passed as a prop from coinMap
  // coin = undefined → analiz devam ediyor
  // coin = null → NONE (analiz edildi ama coinbar gösterme)
  // coin = "BTC" | "ETH" ... → coinbar göster
  const detectedCoin = coin;
  
  // Convert coin to old format for compatibility
  const detectedCrypto = detectedCoin && detectedCoin !== 'NONE' 
    ? { symbol: detectedCoin, name: detectedCoin }
    : null;

  return (
    <article className="border-b border-[#222] pb-4 mb-4 text-[14px] leading-relaxed select-text hover:bg-[#111] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 text-gray-400">
          <span className="text-xs">{getSourceIcon(news.sourceId)}</span>
          <span className="text-xs font-medium">{news.source}</span>
          <span className="text-xs px-1 py-0.5 bg-[#333] rounded text-gray-300">
            {news.category}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatDate(news.pubDate)}
        </span>
      </div>
      
      <div className="font-bold text-[15px] mb-2 text-gray-200 hover:text-white transition-colors cursor-pointer">
        {news.title}
      </div>
      
      {/* Turkish Translation */}
      {news.translatedTitle && news.translatedTitle !== news.title && (
        <div className="text-[12px] text-gray-500 mb-2 italic">
          {news.translatedTitle}
        </div>
      )}
      
      {news.description && (
        <div className="text-[12px] text-gray-400 mb-2">
          {news.description}
        </div>
      )}
      
      {/* Turkish Translation for Description */}
      {news.translatedDescription && news.translatedDescription !== news.description && (
        <div className="text-[11px] text-gray-500 mb-3 italic">
          {news.translatedDescription}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {news.link && (
            <a
              href={news.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Read more →
            </a>
          )}
          {detectedCrypto && onCoinClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                try {
                  console.log('Coin button clicked:', detectedCrypto.symbol);
                  onCoinClick(detectedCrypto.symbol);
                } catch (error) {
                  console.error('Error in coin button click:', error);
                }
              }}
              className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
              title={`View ${detectedCrypto.name} chart`}
            >
              📈 {detectedCrypto.symbol}
            </button>
          )}
      </div>
      </div>
    </article>
  );
};

const NewsSection = ({ onCoinClick }) => {
  const [filter, setFilter] = useState('all');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [translatedNews, setTranslatedNews] = useState([]);
  const [coinMap, setCoinMap] = useState({}); // { [newsId]: "BTC" | "ETH" | null }
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [futuresBases, setFuturesBases] = useState(new Set()); // Binance Futures base assets
  const [translationMap, setTranslationMap] = useState({}); // { [newsId]: { translatedTitle, translatedDescription } }
  
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
    getNewsByCategory,
    getConnectionStatus,
    totalItems
  } = useNewsFeed(autoUpdate ? 15000 : 0); // 15 seconds if auto-update enabled

  // Load Binance Futures base assets on mount
  useEffect(() => {
    async function fetchBases() {
      try {
        console.log('🔄 Loading Binance Futures base assets...');
        const { coinsMap } = await loadBinanceFuturesCoins();
        const bases = new Set(Array.from(coinsMap.values()).map(coin => coin.baseAsset));
        setFuturesBases(bases);
        console.log(`✅ Loaded ${bases.size} Binance Futures base assets`);
      } catch (error) {
        console.error('❌ Failed to load Binance Futures base assets:', error);
        // Fallback to empty set
        setFuturesBases(new Set());
      }
    }
    fetchBases();
  }, []);

  // Translate news when newsData changes, preserving existing translations
  useEffect(() => {
    const translateNews = async () => {
      if (!newsData || newsData.length === 0) {
        setTranslatedNews([]);
        return;
      }

      // Önce mevcut çevirileri koruyarak haberleri merge et
      const newsWithExistingTranslations = newsData.map(news => {
        const existingTranslation = translationMap[news.id];
        if (existingTranslation) {
          // Eğer bu haber daha önce çevrilmişse, çevirileri koru
          return {
            ...news,
            translatedTitle: existingTranslation.translatedTitle,
            translatedDescription: existingTranslation.translatedDescription
          };
        }
        return news;
      });

      if (!translationEnabled) {
        // Çeviri kapalıysa, sadece mevcut çevirileri koru
        setTranslatedNews(newsWithExistingTranslations);
        return;
      }

      // Sadece çevrilmemiş haberleri çevir
      const newsToTranslate = newsWithExistingTranslations.filter(news => !translationMap[news.id]);
      
      if (newsToTranslate.length === 0) {
        // Tüm haberler zaten çevrilmiş
        setTranslatedNews(newsWithExistingTranslations);
        return;
      }

      setIsTranslating(true);
      try {
        console.log('🔄 Starting translation for', newsToTranslate.length, 'new news items...');
        const translated = await translateNewsItems(newsToTranslate);
        
        // Yeni çevirileri translationMap'e kaydet
        const newTranslations = {};
        translated.forEach(item => {
          if (item.translatedTitle) {
            newTranslations[item.id] = {
              translatedTitle: item.translatedTitle,
              translatedDescription: item.translatedDescription
            };
          }
        });

        // translationMap'i güncelle
        setTranslationMap(prev => ({
          ...prev,
          ...newTranslations
        }));

        // Tüm haberleri (eski çeviriler + yeni çeviriler) birleştir
        const allTranslated = newsData.map(news => {
          const translation = translationMap[news.id] || newTranslations[news.id];
          if (translation) {
            return {
              ...news,
              translatedTitle: translation.translatedTitle,
              translatedDescription: translation.translatedDescription
            };
          }
          return news;
        });

        setTranslatedNews(allTranslated);
        console.log('✅ Translation completed successfully');
      } catch (error) {
        console.error('❌ Translation failed:', error);
        // Hata durumunda bile mevcut çevirileri koru
        setTranslatedNews(newsWithExistingTranslations);
      } finally {
        setIsTranslating(false);
      }
    };

    translateNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsData, translationEnabled]); // translationMap'i dependency'den çıkarıyoruz (sonsuz döngüyü önlemek için)

  // translatedNews son halini aldığında Smart Detection analizini başlat
  useEffect(() => {
    if (!translatedNews || translatedNews.length === 0) return;
    if (futuresBases.size === 0) return; // Futures bases yüklenene kadar bekle

    const normalized = translatedNews.map(n => ({
      ...n,
      stableId: makeStableId(n),
    }));

    // Smart Detection - anında analiz (async değil)
    analyzeNewsQueue(normalized, coinMap, setCoinMap, futuresBases);
  }, [translatedNews, futuresBases]); // Haber listesi veya futures bases değiştiğinde çalışır

  const categories = ['all', 'crypto'];
  const connectionStatus = getConnectionStatus();
  
  // Add coin prop to news items for rendering with stableId
  const newsWithCoins = translatedNews.map(news => {
    const stableId = makeStableId(news);
    return {
      ...news,
      stableId,
      coin: coinMap[stableId]
    };
  });
  
  const filteredNews = filter === 'all' 
    ? newsWithCoins 
    : getNewsByCategory(filter, newsWithCoins);

  const handleNewsClick = (news) => {
    if (news.link) {
      window.open(news.link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCoinClick = (symbol) => {
    if (onCoinClick) {
      onCoinClick(symbol);
    }
  };

  return (
    <section className="flex flex-col bg-[#0f0f0f] border border-[#222] rounded-sm p-2 h-[700px]">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#333] flex-shrink-0">
        <h2 className="text-[12px] font-bold text-gray-200 select-text">
          Real-time News Feed
        </h2>
      
        <div className="flex items-center space-x-2">
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
          <span>{totalItems} items</span>
          {successCount > 0 && <span className="text-green-400">• {successCount} sources</span>}
          {errorCount > 0 && <span className="text-red-400">• {errorCount} failed</span>}
          {isStale && <span className="text-yellow-400">• Stale data</span>}
          {error && <span className="text-red-400">• Error</span>}
          {isTranslating && <span className="text-blue-400">• Translating...</span>}
          {Object.keys(coinMap).length < filteredNews.length && (
            <span className="text-purple-400">• Analyzing {Object.keys(coinMap).length}/{filteredNews.length}...</span>
          )}
          {translationEnabled && !isTranslating && <span className="text-blue-400">• TR</span>}
        </div>
        <span>Updated: {getLastUpdateString()}</span>
      </div>

      {/* Filter Buttons - Fixed */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center space-x-1">
          <Filter className="w-3 h-3 text-gray-400" />
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                filter === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#333] text-gray-400 hover:bg-[#444]'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Translation Toggle - Alternative Position */}
        <button
          onClick={() => {
            console.log('TR button clicked, current state:', translationEnabled);
            setTranslationEnabled(!translationEnabled);
          }}
          className={`px-3 py-1 text-xs font-bold rounded transition-colors border ${
            translationEnabled ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-700 text-gray-300 border-gray-600'
          }`}
          title={translationEnabled ? 'Disable Turkish translation' : 'Enable Turkish translation'}
          style={{ minWidth: '30px', minHeight: '24px' }}
        >
          TR
        </button>
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
        ) : filteredNews.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-400 text-sm">No news available</div>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredNews.map((news) => (
              <div key={news.id} onClick={() => handleNewsClick(news)}>
                <NewsItem news={news} coin={news.coin} onCoinClick={handleCoinClick} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsSection;
