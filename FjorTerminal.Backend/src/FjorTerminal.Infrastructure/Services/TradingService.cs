using FjorTerminal.Application.DTOs.Trading;
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
    public class TradingService : ITradingService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ApplicationDbContext _context;
        private readonly IEncryptionService _encryptionService;
        private readonly ILogger<TradingService> _logger;
        private const string BINANCE_API_URL = "https://fapi.binance.com";

        public TradingService(
            IHttpClientFactory httpClientFactory,
            ApplicationDbContext context,
            IEncryptionService encryptionService,
            ILogger<TradingService> logger)
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
                // If decryption fails, try using as plain text (for backward compatibility)
                return (connection.ApiKey, connection.ApiSecret);
            }
        }

        public async Task<OrderResponseDto?> PlaceMarketOrderAsync(Guid userId, MarketOrderDto dto)
        {
            try
            {
                var connection = await GetUserConnectionAsync(userId);
                if (connection == null) return null;

                // Set leverage if specified
                if (dto.Leverage.HasValue)
                {
                    await SetLeverageInternalAsync(connection, dto.Symbol, dto.Leverage.Value);
                }

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                // Format quantity - remove trailing zeros
                var quantityStr = dto.Quantity.ToString("0.########", System.Globalization.CultureInfo.InvariantCulture);
                
                var parameters = new Dictionary<string, string>
                {
                    { "symbol", dto.Symbol },
                    { "side", dto.Side.ToUpper() },
                    { "type", "MARKET" },
                    { "quantity", quantityStr },
                    { "timestamp", timestamp.ToString() }
                };
                
                // Add positionSide if provided (for Hedge mode)
                if (!string.IsNullOrEmpty(dto.PositionSide))
                {
                    parameters.Add("positionSide", dto.PositionSide.ToUpper());
                }
                
                _logger.LogInformation("📤 Placing market order: Symbol={Symbol}, Side={Side}, Quantity={Quantity}, PositionSide={PositionSide}", 
                    dto.Symbol, dto.Side, quantityStr, dto.PositionSide ?? "N/A");

                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);
                var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}"));
                var signature = GenerateSignature(queryString, apiSecret);

                var request = new HttpRequestMessage(HttpMethod.Post,
                    $"{BINANCE_API_URL}/fapi/v1/order?{queryString}&signature={signature}");
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("❌ Failed to place market order: {Content}", content);
                    return null;
                }

                var orderData = JsonSerializer.Deserialize<JsonElement>(content);
                
                // Save trade to database
                await SaveTradeAsync(userId, connection.Id, orderData, "MARKET");

                return ParseOrderResponse(orderData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing market order");
                return null;
            }
        }

        public async Task<OrderResponseDto?> PlaceLimitOrderAsync(Guid userId, LimitOrderDto dto)
        {
            try
            {
                var connection = await GetUserConnectionAsync(userId);
                if (connection == null) return null;

                // Set leverage if specified
                if (dto.Leverage.HasValue)
                {
                    await SetLeverageInternalAsync(connection, dto.Symbol, dto.Leverage.Value);
                }

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                // Determine quantity precision based on symbol
                // BTC/ETH: 3 decimals, Most altcoins: 1 decimal (for flexibility)
                int quantityPrecision = dto.Symbol.Contains("BTC") || dto.Symbol.Contains("ETH") ? 3 : 1;
                var roundedQuantity = Math.Round(dto.Quantity, quantityPrecision);
                
                // If quantity is very small after rounding, set to minimum tradeable amount
                if (roundedQuantity < 0.1m)
                {
                    roundedQuantity = 1; // Minimum 1 for whole unit coins
                }
                
                var quantityStr = roundedQuantity.ToString("0.########", System.Globalization.CultureInfo.InvariantCulture);
                var priceStr = Math.Round(dto.Price, 4).ToString("0.####", System.Globalization.CultureInfo.InvariantCulture);
                
                var parameters = new Dictionary<string, string>
                {
                    { "symbol", dto.Symbol },
                    { "side", dto.Side.ToUpper() },
                    { "type", "LIMIT" },
                    { "quantity", quantityStr },
                    { "price", priceStr },
                    { "timeInForce", "GTC" },
                    { "timestamp", timestamp.ToString() }
                };
                
                // Add positionSide if provided (for Hedge mode)
                if (!string.IsNullOrEmpty(dto.PositionSide))
                {
                    parameters.Add("positionSide", dto.PositionSide.ToUpper());
                }
                
                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);
                var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}"));
                var signature = GenerateSignature(queryString, apiSecret);
                
                _logger.LogInformation("📤 Placing limit order: Symbol={Symbol}, Side={Side}, Quantity={Quantity}, Price={Price}, PositionSide={PositionSide}", 
                    dto.Symbol, dto.Side, quantityStr, priceStr, dto.PositionSide ?? "N/A");
                _logger.LogInformation("🔗 Full query string: {QueryString}", queryString);
                
                var request = new HttpRequestMessage(HttpMethod.Post,
                    $"{BINANCE_API_URL}/fapi/v1/order?{queryString}&signature={signature}");
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("❌ Failed to place limit order: {Content}", content);
                    _logger.LogError("❌ Request params: {QueryString}", queryString);
                    return null;
                }

                var orderData = JsonSerializer.Deserialize<JsonElement>(content);
                
                // Save trade to database
                await SaveTradeAsync(userId, connection.Id, orderData, "LIMIT");

                return ParseOrderResponse(orderData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing limit order");
                return null;
            }
        }

        public async Task<OrderResponseDto?> PlaceStopLossOrderAsync(Guid userId, StopLossOrderDto dto)
        {
            try
            {
                var connection = await GetUserConnectionAsync(userId);
                if (connection == null) return null;

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                var parameters = new Dictionary<string, string>
                {
                    { "symbol", dto.Symbol },
                    { "side", dto.Side.ToUpper() },
                    { "type", "STOP_MARKET" },
                    { "quantity", dto.Quantity.ToString("F8") },
                    { "stopPrice", dto.StopPrice.ToString("F8") },
                    { "timestamp", timestamp.ToString() }
                };

                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);
                var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}"));
                var signature = GenerateSignature(queryString, apiSecret);

                var request = new HttpRequestMessage(HttpMethod.Post,
                    $"{BINANCE_API_URL}/fapi/v1/order?{queryString}&signature={signature}");
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to place stop loss order: {Content}", content);
                    return null;
                }

                var orderData = JsonSerializer.Deserialize<JsonElement>(content);
                return ParseOrderResponse(orderData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing stop loss order");
                return null;
            }
        }

        public async Task<OrderResponseDto?> PlaceTakeProfitOrderAsync(Guid userId, TakeProfitOrderDto dto)
        {
            try
            {
                var connection = await GetUserConnectionAsync(userId);
                if (connection == null) return null;

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                var parameters = new Dictionary<string, string>
                {
                    { "symbol", dto.Symbol },
                    { "side", dto.Side.ToUpper() },
                    { "type", "TAKE_PROFIT_MARKET" },
                    { "quantity", dto.Quantity.ToString("F8") },
                    { "stopPrice", dto.StopPrice.ToString("F8") },
                    { "timestamp", timestamp.ToString() }
                };

                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);
                var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}"));
                var signature = GenerateSignature(queryString, apiSecret);

                var request = new HttpRequestMessage(HttpMethod.Post,
                    $"{BINANCE_API_URL}/fapi/v1/order?{queryString}&signature={signature}");
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to place take profit order: {Content}", content);
                    return null;
                }

                var orderData = JsonSerializer.Deserialize<JsonElement>(content);
                return ParseOrderResponse(orderData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing take profit order");
                return null;
            }
        }

        public async Task<bool> CancelOrderAsync(Guid userId, string symbol, string orderId)
        {
            try
            {
                var connection = await GetUserConnectionAsync(userId);
                if (connection == null) return false;

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                var parameters = new Dictionary<string, string>
                {
                    { "symbol", symbol },
                    { "orderId", orderId },
                    { "timestamp", timestamp.ToString() }
                };

                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);
                var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}"));
                var signature = GenerateSignature(queryString, apiSecret);

                var request = new HttpRequestMessage(HttpMethod.Delete,
                    $"{BINANCE_API_URL}/fapi/v1/order?{queryString}&signature={signature}");
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error canceling order");
                return false;
            }
        }

        public async Task<List<OrderResponseDto>> GetOpenOrdersAsync(Guid userId, string? symbol = null)
        {
            var result = new List<OrderResponseDto>();
            
            try
            {
                var connection = await GetUserConnectionAsync(userId);
                if (connection == null) return result;

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                var parameters = new Dictionary<string, string>
                {
                    { "timestamp", timestamp.ToString() }
                };

                if (!string.IsNullOrEmpty(symbol))
                {
                    parameters.Add("symbol", symbol);
                }

                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);
                var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}"));
                var signature = GenerateSignature(queryString, apiSecret);

                var request = new HttpRequestMessage(HttpMethod.Get,
                    $"{BINANCE_API_URL}/fapi/v1/openOrders?{queryString}&signature={signature}");
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                
                if (!response.IsSuccessStatusCode)
                    return result;

                var content = await response.Content.ReadAsStringAsync();
                var ordersArray = JsonSerializer.Deserialize<JsonElement>(content);

                foreach (var orderData in ordersArray.EnumerateArray())
                {
                    result.Add(ParseOrderResponse(orderData));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting open orders");
            }

            return result;
        }

        public async Task<List<PositionDto>> GetPositionsAsync(Guid userId)
        {
            var result = new List<PositionDto>();
            
            try
            {
                _logger.LogInformation("📍 GetPositionsAsync called for userId: {UserId}", userId);
                
                var connection = await GetUserConnectionAsync(userId);
                if (connection == null)
                {
                    _logger.LogWarning("⚠️ No connection found for userId: {UserId}", userId);
                    return result;
                }
                
                // Decrypt API keys before using
                var (apiKey, apiSecret) = DecryptConnection(connection);
                
                _logger.LogInformation("✅ Connection found for userId: {UserId}, API Key: {ApiKeyPrefix}...", 
                    userId, apiKey?.Substring(0, Math.Min(10, apiKey?.Length ?? 0)));

                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var queryString = $"timestamp={timestamp}";
                var signature = GenerateSignature(queryString, apiSecret);

                var requestUrl = $"{BINANCE_API_URL}/fapi/v2/positionRisk?{queryString}&signature={signature}";
                _logger.LogInformation("🌐 Calling Binance API: {Url}", requestUrl.Replace(signature, "***"));
                
                var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                
                _logger.LogInformation("📡 Binance API response status: {StatusCode}", response.StatusCode);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("❌ Binance API error response: {ErrorContent}", errorContent);
                    return result;
                }

                var content = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("📥 Raw Binance positions response length: {Length}", content.Length);
                _logger.LogInformation("📥 Raw Binance positions response: {Content}", 
                    content.Length > 1000 ? content.Substring(0, 1000) + "..." : content);
                
                var positionsArray = JsonSerializer.Deserialize<JsonElement>(content);
                
                if (positionsArray.ValueKind != System.Text.Json.JsonValueKind.Array)
                {
                    _logger.LogWarning("⚠️ Binance response is not an array: {ValueKind}", positionsArray.ValueKind);
                    return result;
                }
                
                var totalPositionsCount = 0;
                var nonZeroPositionsCount = 0;

                foreach (var positionData in positionsArray.EnumerateArray())
                {
                    totalPositionsCount++;
                    var positionAmtStr = positionData.GetProperty("positionAmt").GetString() ?? "0";
                    var positionAmt = decimal.Parse(positionAmtStr, System.Globalization.CultureInfo.InvariantCulture);
                    var symbol = positionData.GetProperty("symbol").GetString() ?? "";
                    
                    _logger.LogDebug("🔍 Processing position {Symbol}: positionAmt={PositionAmt}", symbol, positionAmt);
                    
                    // Only return positions with non-zero amount
                    if (positionAmt != 0)
                    {
                        nonZeroPositionsCount++;
                        var entryPriceStr = positionData.GetProperty("entryPrice").GetString() ?? "0";
                        var markPriceStr = positionData.GetProperty("markPrice").GetString() ?? "0";
                        var unRealizedProfitStr = positionData.GetProperty("unRealizedProfit").GetString() ?? "0";
                        var liquidationPriceStr = positionData.GetProperty("liquidationPrice").GetString() ?? "0";
                        var isolatedMarginStr = positionData.GetProperty("isolatedMargin").GetString() ?? "0";
                        var isolatedWalletStr = positionData.GetProperty("isolatedWallet").GetString() ?? "0";
                        var notionalStr = positionData.GetProperty("notional").GetString() ?? "0";
                        var marginType = positionData.GetProperty("marginType").GetString() ?? "cross";
                        
                        _logger.LogInformation("✅ Adding position {Symbol}: entryPrice={EntryPrice}, markPrice={MarkPrice}, notional={Notional}, marginType={MarginType}, positionAmt={PositionAmt}", 
                            symbol, entryPriceStr, markPriceStr, notionalStr, marginType, positionAmt);
                        
                        result.Add(new PositionDto
                        {
                            Symbol = symbol,
                            PositionSide = positionData.GetProperty("positionSide").GetString() ?? "",
                            PositionAmt = positionAmt,
                            EntryPrice = decimal.Parse(entryPriceStr, System.Globalization.CultureInfo.InvariantCulture),
                            MarkPrice = decimal.Parse(markPriceStr, System.Globalization.CultureInfo.InvariantCulture),
                            UnrealizedProfit = decimal.Parse(unRealizedProfitStr, System.Globalization.CultureInfo.InvariantCulture),
                            LiquidationPrice = decimal.Parse(liquidationPriceStr, System.Globalization.CultureInfo.InvariantCulture),
                            Leverage = int.Parse(positionData.GetProperty("leverage").GetString() ?? "1"),
                            MarginType = marginType,
                            IsolatedMargin = decimal.Parse(isolatedMarginStr, System.Globalization.CultureInfo.InvariantCulture),
                            IsolatedWallet = decimal.Parse(isolatedWalletStr, System.Globalization.CultureInfo.InvariantCulture),
                            Notional = decimal.Parse(notionalStr, System.Globalization.CultureInfo.InvariantCulture),
                            UpdateTime = DateTimeOffset.FromUnixTimeMilliseconds(positionData.GetProperty("updateTime").GetInt64()).DateTime
                        });
                    }
                }
                
                _logger.LogInformation("📊 Position processing summary: Total={Total}, NonZero={NonZero}, Returning={Returning}", 
                    totalPositionsCount, nonZeroPositionsCount, result.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error getting positions: {Message}, StackTrace: {StackTrace}", 
                    ex.Message, ex.StackTrace);
            }

            return result;
        }

        public async Task<bool> ClosePositionAsync(Guid userId, ClosePositionDto dto)
        {
            try
            {
                var connection = await GetUserConnectionAsync(userId);
                if (connection == null) return false;

                // Get current position
                var positions = await GetPositionsAsync(userId);
                var position = positions.FirstOrDefault(p => p.Symbol == dto.Symbol);
                
                if (position == null || position.PositionAmt == 0)
                    return false;

                // Determine order side (opposite of position)
                var side = position.PositionAmt > 0 ? "SELL" : "BUY";
                var quantity = dto.Quantity ?? Math.Abs(position.PositionAmt);
                var positionSide = position.PositionSide; // LONG, SHORT, or BOTH
                
                _logger.LogInformation("🔴 Closing position {Symbol}: Position={PositionAmt}, PositionSide={PositionSide}, Side={Side}, Quantity={Quantity}", 
                    dto.Symbol, position.PositionAmt, positionSide, side, quantity);

                // Place market order to close
                var marketOrder = new MarketOrderDto
                {
                    Symbol = dto.Symbol,
                    Side = side,
                    Quantity = quantity,
                    PositionSide = positionSide // Required for Hedge mode
                };

                var result = await PlaceMarketOrderAsync(userId, marketOrder);
                
                if (result != null)
                {
                    _logger.LogInformation("✅ Position {Symbol} closed successfully with order {OrderId}", 
                        dto.Symbol, result.OrderId);
                }
                
                return result != null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing position");
                return false;
            }
        }

        public async Task<bool> SetLeverageAsync(Guid userId, SetLeverageDto dto)
        {
            try
            {
                var connection = await GetUserConnectionAsync(userId);
                if (connection == null) return false;

                return await SetLeverageInternalAsync(connection, dto.Symbol, dto.Leverage);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting leverage");
                return false;
            }
        }

        // Helper methods

        private async Task<ExchangeConnection?> GetUserConnectionAsync(Guid userId)
        {
            return await _context.ExchangeConnections
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ExchangeName == "Binance" && c.IsActive);
        }

        private async Task<bool> SetLeverageInternalAsync(ExchangeConnection connection, string symbol, int leverage)
        {
            try
            {
                // Decrypt API keys
                var (apiKey, apiSecret) = DecryptConnection(connection);
                var client = _httpClientFactory.CreateClient("BinanceClient");
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                var parameters = new Dictionary<string, string>
                {
                    { "symbol", symbol },
                    { "leverage", leverage.ToString() },
                    { "timestamp", timestamp.ToString() }
                };

                var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}"));
                var signature = GenerateSignature(queryString, apiSecret);

                var request = new HttpRequestMessage(HttpMethod.Post,
                    $"{BINANCE_API_URL}/fapi/v1/leverage?{queryString}&signature={signature}");
                request.Headers.Add("X-MBX-APIKEY", apiKey);

                var response = await client.SendAsync(request);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting leverage");
                return false;
            }
        }

        private async Task SaveTradeAsync(Guid userId, Guid connectionId, JsonElement orderData, string type)
        {
            try
            {
                // Parse values safely - Binance returns some as strings, some as numbers
                var origQtyStr = orderData.GetProperty("origQty").GetString() ?? "0";
                var priceStr = orderData.TryGetProperty("price", out var price) ? price.GetString() ?? "0" : "0";
                var orderIdStr = orderData.GetProperty("orderId").ToString(); // orderId is a number
                var statusStr = orderData.GetProperty("status").GetString() ?? "NEW";
                
                var trade = new Trade
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    ExchangeConnectionId = connectionId,
                    Symbol = orderData.GetProperty("symbol").GetString() ?? "",
                    Side = orderData.GetProperty("side").GetString() ?? "",
                    Type = type,
                    Quantity = decimal.Parse(origQtyStr, System.Globalization.CultureInfo.InvariantCulture),
                    Price = priceStr != "0" ? decimal.Parse(priceStr, System.Globalization.CultureInfo.InvariantCulture) : null,
                    OrderId = orderIdStr,
                    Status = statusStr,
                    CreatedAt = DateTime.UtcNow,
                    ExecutedAt = statusStr == "FILLED" ? DateTime.UtcNow : null
                };

                _context.Trades.Add(trade);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("✅ Trade saved: {Symbol} {Side} {Quantity} @ {Price}", 
                    trade.Symbol, trade.Side, trade.Quantity, trade.Price);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving trade");
            }
        }

        private OrderResponseDto ParseOrderResponse(JsonElement orderData)
        {
            var origQtyStr = orderData.GetProperty("origQty").GetString() ?? "0";
            var priceStr = orderData.TryGetProperty("price", out var price) ? price.GetString() ?? "0" : "0";
            var execQtyStr = orderData.TryGetProperty("executedQty", out var execQty) ? execQty.GetString() ?? "0" : "0";
            var avgPriceStr = orderData.TryGetProperty("avgPrice", out var avgPrice) ? avgPrice.GetString() ?? "0" : "0";
            var cumQuoteStr = orderData.TryGetProperty("cumQuote", out var cumQuote) ? cumQuote.GetString() ?? "0" : "0";
            
            _logger.LogInformation("📊 Parsing order response: origQty={OrigQty}, executedQty={ExecQty}, avgPrice={AvgPrice}, cumQuote={CumQuote}", 
                origQtyStr, execQtyStr, avgPriceStr, cumQuoteStr);
            
            return new OrderResponseDto
            {
                OrderId = orderData.GetProperty("orderId").ToString(),
                Symbol = orderData.GetProperty("symbol").GetString() ?? "",
                Side = orderData.GetProperty("side").GetString() ?? "",
                Type = orderData.GetProperty("type").GetString() ?? "",
                Status = orderData.GetProperty("status").GetString() ?? "",
                Quantity = decimal.Parse(origQtyStr, System.Globalization.CultureInfo.InvariantCulture),
                Price = priceStr != "0" ? decimal.Parse(priceStr, System.Globalization.CultureInfo.InvariantCulture) : null,
                ExecutedQuantity = execQtyStr != "0" ? decimal.Parse(execQtyStr, System.Globalization.CultureInfo.InvariantCulture) : null,
                CreateTime = DateTimeOffset.FromUnixTimeMilliseconds(orderData.GetProperty("updateTime").GetInt64()).DateTime,
                UpdateTime = DateTimeOffset.FromUnixTimeMilliseconds(orderData.GetProperty("updateTime").GetInt64()).DateTime
            };
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

