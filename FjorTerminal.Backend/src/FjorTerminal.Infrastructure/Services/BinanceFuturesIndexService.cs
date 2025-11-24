using FjorTerminal.Application.Interfaces;
using FjorTerminal.Application.Models.CoinDetection;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FjorTerminal.Infrastructure.Services
{
    public sealed class BinanceFuturesIndexService : IBinanceFuturesIndexService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<BinanceFuturesIndexService> _logger;
        private readonly IMemoryCache _cache;
        private const string CacheKey = "BinanceFuturesIndex";

        public BinanceFuturesIndexService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<BinanceFuturesIndexService> logger,
            IMemoryCache cache)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _cache = cache;
        }

        public async Task<FuturesIndex> GetIndexAsync(CancellationToken cancellationToken = default)
        {
            // Try cache first
            if (_cache.TryGetValue<FuturesIndex>(CacheKey, out var cachedIndex))
            {
                _logger.LogInformation("📦 Using cached Binance Futures index");
                return cachedIndex!;
            }

            // Refresh if not in cache
            return await RefreshIndexAsync(cancellationToken);
        }

        public async Task<FuturesIndex> RefreshIndexAsync(CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("🔄 Refreshing Binance Futures index...");

            var exchangeInfoUrl = _configuration["BinanceFutures:ExchangeInfoUrl"] 
                ?? "https://fapi.binance.com/fapi/v1/exchangeInfo";

            var httpClient = _httpClientFactory.CreateClient("BinanceClient");
            
            try
            {
                var response = await httpClient.GetAsync(exchangeInfoUrl, cancellationToken);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                var exchangeInfo = JsonSerializer.Deserialize<ExchangeInfoResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (exchangeInfo?.Symbols == null)
                {
                    throw new InvalidOperationException("Invalid exchange info response");
                }

                var index = new FuturesIndex
                {
                    BaseAssets = new HashSet<string>(StringComparer.OrdinalIgnoreCase),
                    Symbols = new HashSet<string>(StringComparer.OrdinalIgnoreCase),
                    NameToTicker = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase),
                    TickerAliases = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase)
                };

                // Process only TRADING symbols
                foreach (var symbol in exchangeInfo.Symbols.Where(s => s.Status == "TRADING" && s.ContractType == "PERPETUAL"))
                {
                    var baseAsset = symbol.BaseAsset;
                    var quoteAsset = symbol.QuoteAsset;
                    var ticker = baseAsset;
                    var fullSymbol = $"{baseAsset}{quoteAsset}";

                    index.BaseAssets.Add(baseAsset);
                    index.Symbols.Add(fullSymbol);

                    // Add ticker mappings
                    index.NameToTicker[baseAsset.ToLowerInvariant()] = ticker;
                    index.NameToTicker[ticker.ToLowerInvariant()] = ticker;

                    // Initialize alias list if not exists
                    if (!index.TickerAliases.ContainsKey(ticker))
                    {
                        index.TickerAliases[ticker] = new List<string> { ticker };
                    }
                }

                // Add manual aliases
                AddManualAliases(index);

                // Cache for 6 hours
                _cache.Set(CacheKey, index, TimeSpan.FromHours(6));

                _logger.LogInformation("✅ Binance Futures index refreshed: {Count} symbols, {BaseCount} base assets",
                    index.Symbols.Count, index.BaseAssets.Count);

                return index;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to refresh Binance Futures index");
                throw;
            }
        }

        private void AddManualAliases(FuturesIndex index)
        {
            // Bitcoin
            index.NameToTicker["bitcoin"] = "BTC";
            index.NameToTicker["btc"] = "BTC";
            if (!index.TickerAliases.ContainsKey("BTC"))
                index.TickerAliases["BTC"] = new List<string>();
            index.TickerAliases["BTC"].AddRange(new[] { "Bitcoin", "BTC" });

            // Ethereum
            index.NameToTicker["ethereum"] = "ETH";
            index.NameToTicker["ether"] = "ETH";
            if (!index.TickerAliases.ContainsKey("ETH"))
                index.TickerAliases["ETH"] = new List<string>();
            index.TickerAliases["ETH"].AddRange(new[] { "Ethereum", "ETH", "Ether" });

            // Solana
            index.NameToTicker["solana"] = "SOL";
            if (!index.TickerAliases.ContainsKey("SOL"))
                index.TickerAliases["SOL"] = new List<string>();
            index.TickerAliases["SOL"].AddRange(new[] { "Solana", "SOL" });

            // Ripple
            index.NameToTicker["ripple"] = "XRP";
            if (!index.TickerAliases.ContainsKey("XRP"))
                index.TickerAliases["XRP"] = new List<string>();
            index.TickerAliases["XRP"].AddRange(new[] { "XRP", "Ripple" });

            // Binance Coin
            index.NameToTicker["binance coin"] = "BNB";
            index.NameToTicker["bnb"] = "BNB";
            if (!index.TickerAliases.ContainsKey("BNB"))
                index.TickerAliases["BNB"] = new List<string>();
            index.TickerAliases["BNB"].AddRange(new[] { "BNB", "Binance Coin" });

            // Dogecoin
            index.NameToTicker["dogecoin"] = "DOGE";
            if (!index.TickerAliases.ContainsKey("DOGE"))
                index.TickerAliases["DOGE"] = new List<string>();
            index.TickerAliases["DOGE"].AddRange(new[] { "Dogecoin", "DOGE" });

            // Pepe
            index.NameToTicker["pepe"] = "PEPE";
            if (!index.TickerAliases.ContainsKey("PEPE"))
                index.TickerAliases["PEPE"] = new List<string>();
            index.TickerAliases["PEPE"].AddRange(new[] { "Pepe", "PEPE" });

            // Tron
            index.NameToTicker["tron"] = "TRX";
            if (!index.TickerAliases.ContainsKey("TRX"))
                index.TickerAliases["TRX"] = new List<string>();
            index.TickerAliases["TRX"].AddRange(new[] { "TRON", "TRX" });
        }

        private sealed class ExchangeInfoResponse
        {
            public List<SymbolInfo> Symbols { get; set; } = new();
        }

        private sealed class SymbolInfo
        {
            public string Symbol { get; set; } = "";
            public string BaseAsset { get; set; } = "";
            public string QuoteAsset { get; set; } = "";
            public string Status { get; set; } = "";
            public string ContractType { get; set; } = "";
        }
    }
}

