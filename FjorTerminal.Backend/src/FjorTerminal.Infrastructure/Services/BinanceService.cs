using FjorTerminal.Application.DTOs.Binance;
using FjorTerminal.Application.Interfaces;
using FjorTerminal.Domain.Entities;
using FjorTerminal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace FjorTerminal.Infrastructure.Services
{
    public class BinanceService : IBinanceService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ApplicationDbContext _context;
        private readonly IEncryptionService _encryptionService;
        private readonly ILogger<BinanceService> _logger;
        private const string BINANCE_API_URL = "https://fapi.binance.com";

        public BinanceService(
            IHttpClientFactory httpClientFactory,
            ApplicationDbContext context,
            IEncryptionService encryptionService,
            ILogger<BinanceService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _context = context;
            _encryptionService = encryptionService;
            _logger = logger;
        }

        private (string ApiKey, string ApiSecret) DecryptConnection(ExchangeConnection connection)
        {
            try
            {
                var apiKey = _encryptionService.Decrypt(connection.ApiKey);
                var apiSecret = _encryptionService.Decrypt(connection.ApiSecret);
                return (apiKey, apiSecret);
            }
            catch
            {
                // If decryption fails, it might be plain text (for backward compatibility)
                // Encrypt it now and save back to database (lazy encryption)
                try
                {
                    var encryptedApiKey = _encryptionService.Encrypt(connection.ApiKey);
                    var encryptedApiSecret = _encryptionService.Encrypt(connection.ApiSecret);
                    
                    connection.ApiKey = encryptedApiKey;
                    connection.ApiSecret = encryptedApiSecret;
                    connection.UpdatedAt = DateTime.UtcNow;
                    
                    _context.SaveChangesAsync().ContinueWith(t =>
                    {
                        if (t.IsFaulted)
                        {
                            _logger.LogWarning("Failed to encrypt existing API keys for connection {ConnectionId}", connection.Id);
                        }
                        else
                        {
                            _logger.LogInformation("Successfully encrypted existing API keys for connection {ConnectionId}", connection.Id);
                        }
                    });
                    
                    return (connection.ApiKey, connection.ApiSecret);
                }
                catch
                {
                    // If encryption also fails, return plain text (shouldn't happen)
                    return (connection.ApiKey, connection.ApiSecret);
                }
            }
        }

        public async Task<bool> ValidateCredentialsAsync(string apiKey, string apiSecret)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var queryString = $"timestamp={timestamp}";
                var signature = GenerateSignature(queryString, apiSecret);

                var request = new HttpRequestMessage(HttpMethod.Get, 
                    $"{BINANCE_API_URL}/fapi/v2/account?{queryString}&signature={signature}");
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating Binance credentials");
                return false;
            }
        }

        public async Task<AccountInfoDto?> GetAccountInfoAsync(Guid userId)
        {
            try
            {
                var connection = await _context.ExchangeConnections
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.ExchangeName == "Binance" && c.IsActive);

                if (connection == null)
                    return null;

                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var queryString = $"timestamp={timestamp}";
                var signature = GenerateSignature(queryString, apiSecret);

                var request = new HttpRequestMessage(HttpMethod.Get,
                    $"{BINANCE_API_URL}/fapi/v2/account?{queryString}&signature={signature}");
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to get account info from Binance: {StatusCode}", response.StatusCode);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync();
                var accountData = JsonSerializer.Deserialize<JsonElement>(content);

                // Parse updateTime - if it's 0 or invalid, use current time
                var updateTimeMs = accountData.GetProperty("updateTime").GetInt64();
                _logger.LogInformation("Binance updateTime (ms): {UpdateTimeMs}", updateTimeMs);
                
                var updateTime = updateTimeMs > 0 
                    ? DateTimeOffset.FromUnixTimeMilliseconds(updateTimeMs).DateTime 
                    : DateTime.UtcNow;
                    
                _logger.LogInformation("Parsed updateTime: {UpdateTime}", updateTime);

                var accountInfo = new AccountInfoDto
                {
                    FeeTier = accountData.GetProperty("feeTier").GetInt32(),
                    CanTrade = accountData.GetProperty("canTrade").GetBoolean(),
                    CanDeposit = accountData.GetProperty("canDeposit").GetBoolean(),
                    CanWithdraw = accountData.GetProperty("canWithdraw").GetBoolean(),
                    UpdateTime = updateTime,
                    TotalInitialMargin = decimal.Parse(accountData.GetProperty("totalInitialMargin").GetString() ?? "0"),
                    TotalMaintMargin = decimal.Parse(accountData.GetProperty("totalMaintMargin").GetString() ?? "0"),
                    TotalWalletBalance = decimal.Parse(accountData.GetProperty("totalWalletBalance").GetString() ?? "0"),
                    TotalUnrealizedProfit = decimal.Parse(accountData.GetProperty("totalUnrealizedProfit").GetString() ?? "0"),
                    TotalMarginBalance = decimal.Parse(accountData.GetProperty("totalMarginBalance").GetString() ?? "0"),
                    TotalPositionInitialMargin = decimal.Parse(accountData.GetProperty("totalPositionInitialMargin").GetString() ?? "0"),
                    TotalOpenOrderInitialMargin = decimal.Parse(accountData.GetProperty("totalOpenOrderInitialMargin").GetString() ?? "0"),
                    TotalCrossWalletBalance = decimal.Parse(accountData.GetProperty("totalCrossWalletBalance").GetString() ?? "0"),
                    TotalCrossUnPnl = decimal.Parse(accountData.GetProperty("totalCrossUnPnl").GetString() ?? "0"),
                    AvailableBalance = decimal.Parse(accountData.GetProperty("availableBalance").GetString() ?? "0"),
                    MaxWithdrawAmount = decimal.Parse(accountData.GetProperty("maxWithdrawAmount").GetString() ?? "0"),
                    Assets = new List<AccountBalanceDto>()
                };

                if (accountData.TryGetProperty("assets", out var assets))
                {
                    foreach (var asset in assets.EnumerateArray())
                    {
                        accountInfo.Assets.Add(new AccountBalanceDto
                        {
                            Asset = asset.GetProperty("asset").GetString() ?? "",
                            WalletBalance = decimal.Parse(asset.GetProperty("walletBalance").GetString() ?? "0"),
                            UnrealizedProfit = decimal.Parse(asset.GetProperty("unrealizedProfit").GetString() ?? "0"),
                            MarginBalance = decimal.Parse(asset.GetProperty("marginBalance").GetString() ?? "0"),
                            AvailableBalance = decimal.Parse(asset.GetProperty("availableBalance").GetString() ?? "0"),
                            MaxWithdrawAmount = decimal.Parse(asset.GetProperty("maxWithdrawAmount").GetString() ?? "0")
                        });
                    }
                }

                return accountInfo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account info from Binance");
                return null;
            }
        }

        public async Task<decimal> GetSymbolPriceAsync(string symbol)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("BinanceClient");
                var response = await client.GetAsync($"{BINANCE_API_URL}/fapi/v1/ticker/price?symbol={symbol}");
                
                if (!response.IsSuccessStatusCode)
                    return 0;

                var content = await response.Content.ReadAsStringAsync();
                var priceData = JsonSerializer.Deserialize<JsonElement>(content);
                return decimal.Parse(priceData.GetProperty("price").GetString() ?? "0");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting symbol price from Binance: {Symbol}", symbol);
                return 0;
            }
        }

        public async Task<Dictionary<string, decimal>> GetMultiplePricesAsync(List<string> symbols)
        {
            var result = new Dictionary<string, decimal>();
            
            try
            {
                var client = _httpClientFactory.CreateClient("BinanceClient");
                var response = await client.GetAsync($"{BINANCE_API_URL}/fapi/v1/ticker/price");
                
                if (!response.IsSuccessStatusCode)
                    return result;

                var content = await response.Content.ReadAsStringAsync();
                var pricesArray = JsonSerializer.Deserialize<JsonElement>(content);

                foreach (var priceData in pricesArray.EnumerateArray())
                {
                    var symbol = priceData.GetProperty("symbol").GetString();
                    var price = decimal.Parse(priceData.GetProperty("price").GetString() ?? "0");
                    
                    if (symbol != null && symbols.Contains(symbol))
                    {
                        result[symbol] = price;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting multiple prices from Binance");
            }

            return result;
        }

        public async Task<PlaceOrderResponseDto?> PlaceFuturesOrderAsync(Guid userId, PlaceOrderRequestDto request)
        {
            try
            {
                var connection = await _context.ExchangeConnections
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.ExchangeName == "Binance" && c.IsActive);

                if (connection == null)
                {
                    _logger.LogWarning("No active Binance connection found for user {UserId}", userId);
                    return null;
                }

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                // Build query parameters
                var queryParams = new Dictionary<string, string>
                {
                    ["symbol"] = request.Symbol.ToUpper(),
                    ["side"] = request.Side.ToUpper(),
                    ["type"] = request.Type.ToUpper(),
                    ["quantity"] = request.Quantity,
                    ["timestamp"] = timestamp.ToString()
                };

                // Add positionSide if provided (for hedge mode)
                if (!string.IsNullOrEmpty(request.PositionSide))
                {
                    queryParams["positionSide"] = request.PositionSide.ToUpper();
                }

                var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={kvp.Value}"));
                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);
                var signature = GenerateSignature(queryString, apiSecret);

                var httpRequest = new HttpRequestMessage(HttpMethod.Post,
                    $"{BINANCE_API_URL}/fapi/v1/order?{queryString}&signature={signature}");
                httpRequest.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(httpRequest);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to place order: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync();
                var orderData = JsonSerializer.Deserialize<JsonElement>(content);

                return new PlaceOrderResponseDto
                {
                    OrderId = orderData.GetProperty("orderId").GetInt64(),
                    Symbol = orderData.GetProperty("symbol").GetString() ?? "",
                    Status = orderData.GetProperty("status").GetString() ?? "",
                    Side = orderData.GetProperty("side").GetString() ?? "",
                    Type = orderData.GetProperty("type").GetString() ?? "",
                    OrigQty = orderData.GetProperty("origQty").GetString() ?? "",
                    ExecutedQty = orderData.GetProperty("executedQty").GetString() ?? "",
                    AvgPrice = orderData.GetProperty("avgPrice").GetString() ?? "0",
                    CumQuote = orderData.GetProperty("cumQuote").GetString() ?? "0"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing futures order for user {UserId}", userId);
                return null;
            }
        }

        public async Task<SetLeverageResponseDto?> SetLeverageAsync(Guid userId, SetLeverageRequestDto request)
        {
            try
            {
                var connection = await _context.ExchangeConnections
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.ExchangeName == "Binance" && c.IsActive);

                if (connection == null)
                {
                    _logger.LogWarning("No active Binance connection found for user {UserId}", userId);
                    return null;
                }

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);
                var queryString = $"symbol={request.Symbol.ToUpper()}&leverage={request.Leverage}&timestamp={timestamp}";
                var signature = GenerateSignature(queryString, apiSecret);

                var httpRequest = new HttpRequestMessage(HttpMethod.Post,
                    $"{BINANCE_API_URL}/fapi/v1/leverage?{queryString}&signature={signature}");
                httpRequest.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(httpRequest);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to set leverage: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync();
                var leverageData = JsonSerializer.Deserialize<JsonElement>(content);

                return new SetLeverageResponseDto
                {
                    Leverage = leverageData.GetProperty("leverage").GetInt32(),
                    Symbol = leverageData.GetProperty("symbol").GetString() ?? "",
                    MaxNotionalValue = decimal.Parse(leverageData.GetProperty("maxNotionalValue").GetString() ?? "0")
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting leverage for user {UserId}", userId);
                return null;
            }
        }

        private string GenerateSignature(string queryString, string apiSecret)
        {
            var keyBytes = Encoding.UTF8.GetBytes(apiSecret);
            var queryBytes = Encoding.UTF8.GetBytes(queryString);
            
            using var hmac = new HMACSHA256(keyBytes);
            var hash = hmac.ComputeHash(queryBytes);
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }
    }
}

