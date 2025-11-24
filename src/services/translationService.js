// DeepL API Key
const DEEPL_API_KEY = '1a55c35e-1990-485b-86c0-3da7ec7d0831:fx';

// DeepL API endpoint (using Vite proxy)
const DEEPL_API_URL = '/api/deepl/translate';

/**
 * Translate text from English to Turkish using DeepL API with retry mechanism
 * @param {string} text - Text to translate
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<string>} - Translated text
 */
export const translateToTurkish = async (text, retryCount = 0) => {
  try {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // Skip translation if text is too short or already contains Turkish characters
    if (text.length < 3) {
      return text;
    }

    // Check if text already contains Turkish characters (basic detection)
    const turkishChars = /[çğıöşüÇĞIİÖŞÜ]/;
    if (turkishChars.test(text)) {
      return text; // Already in Turkish
    }

    console.log('🔄 Translating:', text.substring(0, 50) + '...');
    
    // Use fetch to call DeepL API directly
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'auth_key': DEEPL_API_KEY,
        'text': text,
        'target_lang': 'TR',
        'source_lang': 'EN'
      })
    });

    if (!response.ok) {
      if (response.status === 429 && retryCount < 2) {
        // Rate limit hit, wait and retry
        const waitTime = (retryCount + 1) * 5000; // 5s, 10s
        console.log(`⏳ Rate limit hit, waiting ${waitTime/1000}s before retry ${retryCount + 1}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return translateToTurkish(text, retryCount + 1);
      }
      throw new Error(`DeepL API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.translations && data.translations.length > 0) {
      const translatedText = data.translations[0].text;
      console.log('✅ Translation result:', translatedText);
      return translatedText;
    } else {
      throw new Error('No translation returned from DeepL API');
    }
    
  } catch (error) {
    console.error('❌ Translation error:', error);
    
    // Return original text if translation fails
    return text;
  }
};

/**
 * Translate multiple texts in batch with rate limiting
 * @param {string[]} texts - Array of texts to translate
 * @returns {Promise<string[]>} - Array of translated texts
 */
export const translateMultipleToTurkish = async (texts) => {
  try {
    if (!Array.isArray(texts) || texts.length === 0) {
      return texts;
    }

    const results = [];
    
    // Process texts one by one to avoid rate limiting
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const result = await translateToTurkish(text);
      results.push(result);
      
      // Add delay between requests to avoid rate limiting (2 seconds)
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
    
  } catch (error) {
    console.error('❌ Batch translation error:', error);
    return texts; // Return original texts if batch translation fails
  }
};

/**
 * Translate news item (title and description)
 * @param {Object} newsItem - News item with title and description
 * @returns {Promise<Object>} - News item with translated title and description
 */
export const translateNewsItem = async (newsItem) => {
  try {
    if (!newsItem || typeof newsItem !== 'object') {
      return newsItem;
    }

    const { title, description, ...rest } = newsItem;

    // Translate title and description
    const [translatedTitle, translatedDescription] = await Promise.all([
      translateToTurkish(title),
      translateToTurkish(description)
    ]);

    return {
      ...rest,
      title,
      description,
      translatedTitle,
      translatedDescription
    };
    
  } catch (error) {
    console.error('❌ News item translation error:', error);
    return newsItem; // Return original news item if translation fails
  }
};

/**
 * Translate array of news items (limited to first 3 items to avoid rate limits)
 * @param {Object[]} newsItems - Array of news items
 * @returns {Promise<Object[]>} - Array of news items with translations
 */
export const translateNewsItems = async (newsItems) => {
  try {
    if (!Array.isArray(newsItems) || newsItems.length === 0) {
      return newsItems;
    }

    // Limit to first 3 items to avoid rate limits
    const itemsToTranslate = newsItems.slice(0, 3);
    const remainingItems = newsItems.slice(3);
    
    console.log(`🔄 Translating ${itemsToTranslate.length} news items (limited to avoid rate limits)...`);
    
    const results = [];
    
    // Process items one by one with delay
    for (let i = 0; i < itemsToTranslate.length; i++) {
      const item = itemsToTranslate[i];
      const translatedItem = await translateNewsItem(item);
      results.push(translatedItem);
      
      // Add delay between items (3 seconds)
      if (i < itemsToTranslate.length - 1) {
        console.log(`⏳ Waiting 3 seconds before next translation...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Add remaining items without translation
    const finalResults = [...results, ...remainingItems];

    console.log('✅ News items translation completed');
    return finalResults;
    
  } catch (error) {
    console.error('❌ News items translation error:', error);
    return newsItems; // Return original news items if translation fails
  }
};

export default {
  translateToTurkish,
  translateMultipleToTurkish,
  translateNewsItem,
  translateNewsItems
};
