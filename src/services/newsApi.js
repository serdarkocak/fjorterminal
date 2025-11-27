// News API service for fetching RSS feeds
const DEFAULT_NEWS_SOURCES = [
  {
    id: 'coindesk',
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    type: 'rss',
    category: 'crypto',
    enabled: true
  },
  {
    id: 'coinkolik',
    name: 'CoinKolik',
    url: 'https://coinkolik.com/feed/',
    type: 'rss',
    category: 'crypto',
    enabled: true
  },
  {
    id: 'uzmancoin',
    name: 'UzmanCoin',
    url: 'https://uzmancoin.com/feed/',
    type: 'rss',
    category: 'crypto',
    enabled: true
  },
  {
    id: 'cointelegraph',
    name: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss',
    type: 'rss',
    category: 'crypto',
    enabled: true
  },
  {
    id: 'financefeeds',
    name: 'FinanceFeeds - Digital Assets',
    url: 'https://financefeeds.com/category/digital-assets/feed/',
    type: 'rss',
    category: 'crypto',
    enabled: true
  },
  {
    id: 'politico',
    name: 'Politico - Economy',
    url: 'https://rss.politico.com/economy.xml',
    type: 'rss',
    category: 'economy',
    enabled: true
  },
  {
    id: 'ninjanews',
    name: 'Ninja News',
    url: 'https://ninjanews.io/feed/',
    type: 'rss',
    category: 'crypto',
    enabled: true
  },
  {
    id: 'dlnews',
    name: 'DL News - Markets',
    url: 'https://www.dlnews.com/arc/outboundfeeds/rss/category/articles/markets/',
    type: 'rss',
    category: 'crypto',
    enabled: true
  },
  {
    id: 'theblock',
    name: 'The Block',
    url: 'https://www.theblock.co/rss.xml',
    type: 'rss',
    category: 'crypto',
    enabled: true
  },
  {
    id: 'decrypt',
    name: 'Decrypt',
    url: 'https://decrypt.co/feed',
    type: 'rss',
    category: 'crypto',
    enabled: true
  }
];

// Get all news sources (default only)
const getAllNewsSources = () => {
  return [...DEFAULT_NEWS_SOURCES];
};

// Cache for RSS feeds
const feedCache = new Map();
const CACHE_DURATION = 10 * 1000; // 10 seconds cache

/**
 * Clean HTML/XML content from description
 */
const cleanHtmlContent = (html) => {
  if (!html) return '';
  
  let text = html;
  
  // Remove CDATA blocks first
  text = text.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
  
  // Remove script tags and their contents (like Google Analytics)
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their contents
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove all HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove all <img> tags BEFORE parsing to prevent image downloads
  // This prevents browser from loading images when we set innerHTML
  text = text.replace(/<img[^>]*>/gi, '');
  text = text.replace(/<img\s+[^>]*\/?>/gi, '');
  
  // Create a temporary div to decode HTML entities
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  
  // Get text content (this removes all HTML tags)
  text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Additional cleanup for common entities and patterns
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\[CDATA\[/g, '')
    .replace(/\]\]/g, '')
    .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  return text;
};

/**
 * Parse RSS XML using browser's native DOMParser
 */
const parseRSS = (xmlText, sourceId) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('RSS parsing error: ' + parseError.textContent);
    }
    
    const items = xmlDoc.querySelectorAll('item');
    const newsItems = [];
    
    items.forEach((item, index) => {
      const title = item.querySelector('title')?.textContent || 'No title';
      const description = item.querySelector('description')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '#';
      const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
      const guid = item.querySelector('guid')?.textContent || `${sourceId}_${index}`;
      
      // Clean up description using the cleanHtmlContent function
      // For FinanceFeeds, don't include description (only title)
      const cleanDescription = sourceId === 'financefeeds' ? '' : cleanHtmlContent(description);
      
      newsItems.push({
        id: `${sourceId}_${guid}`,
        title: cleanHtmlContent(title),
        description: cleanDescription,
        link: link.trim(),
        pubDate: pubDate.trim(),
        source: DEFAULT_NEWS_SOURCES.find(s => s.id === sourceId)?.name || sourceId,
        sourceId: sourceId,
        category: 'crypto',
        type: 'rss'
      });
    });
    
    return newsItems;
  } catch (error) {
    console.error(`Error parsing RSS for ${sourceId}:`, error);
    return [];
  }
};

/**
 * Fetch RSS feed data
 */
export const fetchRSSFeed = async (source) => {
  try {
    const cacheKey = `rss_${source.id}`;
    const cached = feedCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Using cached data for ${source.name}`);
      return cached.data;
    }

    console.log(`Fetching RSS feed: ${source.name} - ${source.url}`);
    
    let fetchUrl = source.url;
    
    // If it's an external URL (custom RSS feed), route through backend
    const isExternalFeed = source.url.startsWith('http') && !source.url.includes('localhost:5173');
    
    if (isExternalFeed) {
      // Route through backend to bypass CORS
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
      const backendUrl = apiBaseUrl || '/api';
      fetchUrl = `${backendUrl}/News/rss?url=${encodeURIComponent(source.url)}`;
      console.log(`Routing external RSS feed through backend: ${source.name}`);
      
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const backendData = await response.json();
      
      if (!backendData.success) {
        throw new Error(backendData.message || 'Failed to fetch feed');
      }
      
      // Transform backend response to match our format and clean HTML
      // For FinanceFeeds, don't include description (only title)
      const newsItems = backendData.items.map((item, index) => ({
        id: `${source.id}_${index}`,
        title: cleanHtmlContent(item.title),
        description: source.id === 'financefeeds' ? '' : cleanHtmlContent(item.description),
        link: item.link,
        pubDate: item.pubDate,
        source: source.name,
        sourceId: source.id,
        category: source.category || 'crypto',
        type: 'rss'
      }));
      
      const data = {
        source: source.name,
        sourceId: source.id,
        items: newsItems.slice(0, 15),
        lastUpdated: new Date().toISOString(),
        success: true
      };
      
      feedCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      console.log(`Successfully fetched ${newsItems.length} items from ${source.name}`);
      return data;
    }
    
    // For local proxy feeds, use direct fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlText = await response.text();
    const newsItems = parseRSS(xmlText, source.id);

    const data = {
      source: source.name,
      sourceId: source.id,
      items: newsItems.slice(0, 15), // Get latest 15 news items
      lastUpdated: new Date().toISOString(),
      success: true
    };

    // Cache the result
    feedCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    console.log(`Successfully fetched ${newsItems.length} items from ${source.name}`);
    return data;
  } catch (error) {
    console.error(`Error fetching RSS feed ${source.name}:`, error);
    return {
      source: source.name,
      sourceId: source.id,
      items: [],
      error: error.message,
      lastUpdated: new Date().toISOString(),
      success: false
    };
  }
};

/**
 * Fetch all RSS feeds
 */
export const fetchAllNews = async () => {
  try {
    console.log('Fetching all news feeds...');
    
    // Get all sources (default only)
    const allSources = getAllNewsSources();
    console.log(`Found ${allSources.length} news sources`);
    
    // Fetch all feeds in parallel
    const promises = allSources.map(source => fetchRSSFeed(source));
    const results = await Promise.allSettled(promises);
    
    // Process results
    const feeds = [];
    const allNewsItems = [];
    let successCount = 0;
    let errorCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const feedData = result.value;
        feeds.push(feedData);
        
        if (feedData.success) {
          allNewsItems.push(...feedData.items);
          successCount++;
        } else {
          errorCount++;
        }
      } else {
        console.error(`Failed to fetch ${allSources[index].name}:`, result.reason);
        errorCount++;
      }
    });
    
    // Sort all news items by publication date (newest first)
    allNewsItems.sort((a, b) => {
      const dateA = new Date(a.pubDate);
      const dateB = new Date(b.pubDate);
      return dateB - dateA;
    });
    
    const result = {
      feeds,
      items: allNewsItems,
      totalItems: allNewsItems.length,
      successCount,
      errorCount,
      lastUpdated: new Date().toISOString()
    };
    
    console.log(`News fetch completed: ${successCount} successful, ${errorCount} failed, ${allNewsItems.length} total items`);
    return result;
  } catch (error) {
    console.error('Error fetching all news:', error);
    const allSources = getAllNewsSources();
    return {
      feeds: [],
      items: [],
      totalItems: 0,
      successCount: 0,
      errorCount: allSources.length,
      error: error.message,
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * Clear cache
 */
export const clearNewsCache = () => {
  feedCache.clear();
  console.log('News cache cleared');
};

/**
 * Get news sources configuration
 */
export const getNewsSources = () => {
  return getAllNewsSources();
};

/**
 * Get default news sources
 */
export const getDefaultNewsSources = () => {
  return DEFAULT_NEWS_SOURCES;
};

export default {
  fetchRSSFeed,
  fetchAllNews,
  clearNewsCache,
  getNewsSources,
  getDefaultNewsSources
};
