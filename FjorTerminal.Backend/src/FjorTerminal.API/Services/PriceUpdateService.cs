using FjorTerminal.API.Hubs;
using FjorTerminal.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using FjorTerminal.Infrastructure.Data;

namespace FjorTerminal.API.Services
{
    public class PriceUpdateService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHubContext<TradingHub> _hubContext;
        private readonly ILogger<PriceUpdateService> _logger;
        
        // Dynamic symbol list - will be updated from user settings
        private HashSet<string> _activeSymbols = new();
        private readonly object _symbolsLock = new object();
        
        private readonly TimeSpan _updateInterval = TimeSpan.FromSeconds(3);
        private readonly TimeSpan _settingsRefreshInterval = TimeSpan.FromMinutes(5); // Refresh active symbols every 5 mins

        public PriceUpdateService(
            IServiceProvider serviceProvider,
            IHubContext<TradingHub> hubContext,
            ILogger<PriceUpdateService> logger)
        {
            _serviceProvider = serviceProvider;
            _hubContext = hubContext;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🚀 Price Update Service started - Dynamic symbol loading enabled");

            // Initial symbol refresh
            await RefreshActiveSymbols();
            
            var lastSettingsRefresh = DateTime.UtcNow;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Refresh active symbols periodically
                    if (DateTime.UtcNow - lastSettingsRefresh > _settingsRefreshInterval)
                    {
                        await RefreshActiveSymbols();
                        lastSettingsRefresh = DateTime.UtcNow;
                    }

                    await UpdatePrices();
                    await Task.Delay(_updateInterval, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Error updating prices");
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                }
            }

            _logger.LogInformation("⏹️ Price Update Service stopped");
        }

        private async Task RefreshActiveSymbols()
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                // Get all user settings from database
                var allSettings = await dbContext.UserSettings
                    .AsNoTracking()
                    .ToListAsync();

                var newSymbols = new HashSet<string>();

                // Extract symbols from all users' ticker shortcuts and watchlists
                foreach (var userSetting in allSettings)
                {
                    // Add ticker shortcuts (like "BTC", "ETH")
                    if (!string.IsNullOrEmpty(userSetting.TickerShortcuts))
                    {
                        try
                        {
                            var tickers = System.Text.Json.JsonSerializer.Deserialize<List<TickerShortcut>>(
                                userSetting.TickerShortcuts);
                            
                            if (tickers != null)
                            {
                                foreach (var ticker in tickers)
                                {
                                    if (!string.IsNullOrWhiteSpace(ticker.BaseAsset))
                                    {
                                        newSymbols.Add($"{ticker.BaseAsset.ToUpper()}USDT");
                                    }
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to parse ticker shortcuts for user {UserId}", userSetting.UserId);
                        }
                    }

                    // Add crypto detected coins (watchlist)
                    if (!string.IsNullOrEmpty(userSetting.CryptoDetectedCoins))
                    {
                        try
                        {
                            var detectedCoins = System.Text.Json.JsonSerializer.Deserialize<List<string>>(
                                userSetting.CryptoDetectedCoins);
                            
                            if (detectedCoins != null)
                            {
                                foreach (var coin in detectedCoins)
                                {
                                    if (!string.IsNullOrWhiteSpace(coin))
                                    {
                                        // If already in "XXXUSDT" format, use as-is, otherwise append USDT
                                        var symbol = coin.ToUpper().EndsWith("USDT") 
                                            ? coin.ToUpper() 
                                            : $"{coin.ToUpper()}USDT";
                                        newSymbols.Add(symbol);
                                    }
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to parse crypto detected coins for user {UserId}", userSetting.UserId);
                        }
                    }
                }

                // Always include major coins as fallback
                var fallbackSymbols = new[] { "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT" };
                foreach (var symbol in fallbackSymbols)
                {
                    newSymbols.Add(symbol);
                }

                lock (_symbolsLock)
                {
                    _activeSymbols = newSymbols;
                }

                _logger.LogInformation("📊 Active symbols refreshed: {Count} unique symbols - {Symbols}", 
                    _activeSymbols.Count, 
                    string.Join(", ", _activeSymbols.Take(10)) + (_activeSymbols.Count > 10 ? "..." : ""));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error refreshing active symbols, keeping current list");
            }
        }

        // Helper class for deserializing ticker shortcuts
        private class TickerShortcut
        {
            public string BaseAsset { get; set; } = string.Empty;
            public int PriceDecimals { get; set; }
        }

        private async Task UpdatePrices()
        {
            List<string> symbolsToUpdate;
            
            lock (_symbolsLock)
            {
                if (_activeSymbols.Count == 0)
                {
                    _logger.LogWarning("⚠️ No active symbols to update");
                    return;
                }
                symbolsToUpdate = _activeSymbols.ToList();
            }

            using var scope = _serviceProvider.CreateScope();
            var binanceService = scope.ServiceProvider.GetRequiredService<IBinanceService>();
            var cacheService = scope.ServiceProvider.GetRequiredService<ICacheService>();

            try
            {
                var prices = await binanceService.GetMultiplePricesAsync(symbolsToUpdate);

                foreach (var symbol in symbolsToUpdate)
                {
                    if (prices.TryGetValue(symbol, out var price))
                    {
                        var priceData = new
                        {
                            symbol,
                            price,
                            timestamp = DateTime.UtcNow
                        };

                        // Cache price data (2 minutes expiry)
                        await cacheService.SetAsync($"price:{symbol}", priceData, TimeSpan.FromMinutes(2));

                        // Send to all subscribed clients
                        await _hubContext.Clients.Group($"symbol_{symbol}").SendAsync("PriceUpdate", priceData);
                        
                        // Also broadcast to all connected clients (for dashboard)
                        await _hubContext.Clients.All.SendAsync("PriceUpdate", priceData);
                    }
                }

                _logger.LogDebug("💰 Updated {Count} prices for {SymbolCount} symbols", prices.Count, symbolsToUpdate.Count);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "❌ Error fetching prices from Binance");
            }
        }
    }
}

