// Binance Futures Service
// Loads coin data from exchangeInfo.json and creates a search map

import logger from '../utils/logger';

let cachedCoinsMap = null;
let cachedAliasesMap = null;

/**
 * Load Binance Futures coins from exchangeInfo.json
 * Filters for PERPETUAL contracts with TRADING status and USDT quote
 * @returns {Promise<Map<string, {baseAsset: string, symbol: string, name: string}>>}
 */
export const loadBinanceFuturesCoins = async () => {
  try {
    // Return cached data if available
    if (cachedCoinsMap && cachedAliasesMap) {
      logger.debug('📦 Using cached Binance Futures coins');
      return { coinsMap: cachedCoinsMap, aliasesMap: cachedAliasesMap };
    }

    logger.info('🔄 Loading Binance Futures coins from exchangeInfo.json...');

    // Import the JSON file
    // Vite automatically parses JSON files, and they're exported as default
    const exchangeInfoModule = await import('../../exchangeInfo.json');
    
    // Vite returns JSON as default export
    const exchangeInfo = exchangeInfoModule.default || exchangeInfoModule;

    if (!exchangeInfo || !exchangeInfo.symbols) {
      throw new Error('Invalid exchangeInfo.json format - missing symbols array');
    }

    const symbols = exchangeInfo.symbols;

    // Filter only PERPETUAL contracts with USDT quote and TRADING status
    // Also filter out single-character baseAssets (minimum 2 characters)
    const futuresCoins = symbols
      .filter(symbol => 
        symbol.symbol && 
        symbol.symbol.endsWith('USDT') && 
        symbol.status === 'TRADING' &&
        symbol.contractType === 'PERPETUAL' &&
        symbol.baseAsset && 
        symbol.baseAsset.length >= 2 // Minimum 2 characters
      )
      .map(symbol => ({
        baseAsset: symbol.baseAsset,
        symbol: symbol.symbol,
        name: symbol.baseAsset
      }));

    // Create a map: baseAsset -> coin info (for exact matches)
    const coinsMap = new Map();
    futuresCoins.forEach(coin => {
      // Store lowercase baseAsset as key
      const key = coin.baseAsset.toLowerCase();
      if (!coinsMap.has(key)) {
        coinsMap.set(key, {
          baseAsset: coin.baseAsset,
          symbol: coin.symbol,
          name: coin.name
        });
      }
    });

    // Create aliases map for common coin names
    // This allows matching "bitcoin" -> BTC, "ethereum" -> ETH, etc.
    const aliasesMap = createAliasesMap(coinsMap);

    // Cache the results
    cachedCoinsMap = coinsMap;
    cachedAliasesMap = aliasesMap;

    logger.info(`✅ Loaded ${futuresCoins.length} Binance Futures coins`);
    logger.info(`✅ Created map with ${coinsMap.size} base assets and ${aliasesMap.size} aliases`);
    
    return { coinsMap, aliasesMap };

  } catch (error) {
    logger.error('❌ Error loading Binance Futures coins:', error);
    
    // Return empty maps if loading fails
    return { coinsMap: new Map(), aliasesMap: new Map() };
  }
};

/**
 * Create aliases map for common coin names
 * @param {Map} coinsMap - Map of baseAsset -> coin info
 * @returns {Map<string, {baseAsset: string, symbol: string, name: string}>}
 */
const createAliasesMap = (coinsMap) => {
  const aliasesMap = new Map();

  // Common aliases for well-known coins
  const aliasDefinitions = {
    'BTC': ['bitcoin'],
    'ETH': ['ethereum', 'ether'],
    'XRP': ['ripple'],
    'ADA': ['cardano'],
    'SOL': ['solana'],
    'DOT': ['polkadot'],
    'LINK': ['chainlink'],
    'LTC': ['litecoin'],
    'BNB': ['binance', 'binance coin'],
    'DOGE': ['dogecoin', 'doge'],
    'SHIB': ['shiba', 'shiba inu'],
    'AVAX': ['avalanche'],
    'MATIC': ['polygon'],
    'POL': ['polygon'],
    'UNI': ['uniswap'],
    'AAVE': ['aave'],
    'COMP': ['compound'],
    'MKR': ['maker'],
    'CRV': ['curve'],
    'YFI': ['yearn', 'yearn finance'],
    'TRX': ['tron', 'tronix'],
    'XLM': ['stellar'],
    'XMR': ['monero'],
    'EOS': ['eos'],
    'XTZ': ['tezos'],
    'ATOM': ['cosmos'],
    'ALGO': ['algorand'],
    'FIL': ['filecoin'],
    'VET': ['vechain'],
    'HBAR': ['hedera'],
    'NEAR': ['near', 'near protocol'],
    'FTM': ['fantom'],
    'EGLD': ['elrond', 'multiversx'],
    'GRT': ['the graph', 'graph'],
    'CHZ': ['chiliz'],
    'ENJ': ['enjin'],
    'MANA': ['decentraland'],
    'SAND': ['sandbox', 'the sandbox'],
    'AXS': ['axie', 'axie infinity'],
    'GALA': ['gala'],
    'FLOW': ['flow'],
    'ICP': ['internet computer'],
    'THETA': ['theta', 'theta network'],
    'KLAY': ['klaytn'],
    'LUNA': ['terra', 'luna'],
    'LUNC': ['terra classic', 'luna classic'],
    'PEPE': ['pepe'],
    'WLD': ['worldcoin'],
    'ARB': ['arbitrum'],
    'OP': ['optimism'],
    'SUI': ['sui'],
    'APT': ['aptos'],
    'SEI': ['sei'],
    'TIA': ['celestia']
  };

  // Add aliases to the map
  Object.entries(aliasDefinitions).forEach(([baseAsset, aliases]) => {
    const coinInfo = coinsMap.get(baseAsset.toLowerCase());
    if (coinInfo) {
      aliases.forEach(alias => {
        // Only add aliases with at least 2 characters
        if (alias && alias.length >= 2) {
          aliasesMap.set(alias.toLowerCase(), coinInfo);
        }
      });
    }
  });

  return aliasesMap;
};

/**
 * Clear cache (useful for testing or reloading data)
 */
export const clearCache = () => {
  cachedCoinsMap = null;
  cachedAliasesMap = null;
  logger.debug('🗑️ Binance Futures cache cleared');
};

