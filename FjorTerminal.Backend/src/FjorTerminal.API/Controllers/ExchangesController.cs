using FjorTerminal.Application.DTOs.Binance;
using FjorTerminal.Application.Interfaces;
using FjorTerminal.Domain.Entities;
using FjorTerminal.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FjorTerminal.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    public class ExchangesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IBinanceService _binanceService;
        private readonly IEncryptionService _encryptionService;
        private readonly ILogger<ExchangesController> _logger;

        public ExchangesController(
            ApplicationDbContext context,
            IBinanceService binanceService,
            IEncryptionService encryptionService,
            ILogger<ExchangesController> logger)
        {
            _context = context;
            _binanceService = binanceService;
            _encryptionService = encryptionService;
            _logger = logger;
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                            ?? User.FindFirst("sub")?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("Invalid user");

            return userId;
        }

        [HttpGet]
        public async Task<IActionResult> GetExchangeConnections()
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("Getting exchange connections for user: {UserId}", userId);
                
                // First, fetch the connections from database
                var connections = await _context.ExchangeConnections
                    .Where(c => c.UserId == userId)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} connections for user {UserId}", connections.Count, userId);

                // Then, apply masking in memory (decrypt first if encrypted)
                var maskedConnections = connections.Select(c =>
                {
                    string apiKeyForMasking;
                    try
                    {
                        // Try to decrypt (if it's encrypted)
                        apiKeyForMasking = _encryptionService.Decrypt(c.ApiKey);
                    }
                    catch
                    {
                        // If decryption fails, it might be plain text (for backward compatibility)
                        apiKeyForMasking = c.ApiKey;
                    }

                    return new
                    {
                        c.Id,
                        c.ExchangeName,
                        c.IsActive,
                        c.CreatedAt,
                        ApiKeyMasked = MaskApiKey(apiKeyForMasking)
                    };
                }).ToList();

                return Ok(new { success = true, data = maskedConnections });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exchange connections");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddExchangeConnection([FromBody] BinanceCredentialsDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                
                _logger.LogInformation("Adding exchange connection for user: {UserId}", userId);
                _logger.LogInformation("API Key length: {Length}, Secret Key length: {SecretLength}", 
                    dto.ApiKey?.Length ?? 0, dto.ApiSecret?.Length ?? 0);
                
                // Validate input
                if (string.IsNullOrWhiteSpace(dto.ApiKey) || string.IsNullOrWhiteSpace(dto.ApiSecret))
                {
                    return BadRequest(new { success = false, message = "API Key and Secret Key are required" });
                }

                // Validate credentials
                var isValid = await _binanceService.ValidateCredentialsAsync(dto.ApiKey, dto.ApiSecret);
                if (!isValid)
                {
                    return BadRequest(new { success = false, message = "Invalid API credentials" });
                }

                // Check if connection already exists
                var existingConnection = await _context.ExchangeConnections
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.ExchangeName == "Binance");

                // Encrypt API keys before saving
                var encryptedApiKey = _encryptionService.Encrypt(dto.ApiKey);
                var encryptedApiSecret = _encryptionService.Encrypt(dto.ApiSecret);

                if (existingConnection != null)
                {
                    // Update existing connection
                    existingConnection.ApiKey = encryptedApiKey;
                    existingConnection.ApiSecret = encryptedApiSecret;
                    existingConnection.IsActive = true;
                    existingConnection.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Create new connection
                    var connection = new ExchangeConnection
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        ExchangeName = "Binance",
                        ApiKey = encryptedApiKey,
                        ApiSecret = encryptedApiSecret,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.ExchangeConnections.Add(connection);
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Exchange connection added successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding exchange connection");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateExchangeConnection(Guid id, [FromBody] BinanceCredentialsDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var connection = await _context.ExchangeConnections
                    .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

                if (connection == null)
                    return NotFound(new { success = false, message = "Connection not found" });

                // Validate credentials
                var isValid = await _binanceService.ValidateCredentialsAsync(dto.ApiKey, dto.ApiSecret);
                if (!isValid)
                {
                    return BadRequest(new { success = false, message = "Invalid API credentials" });
                }

                // Encrypt API keys before saving
                var encryptedApiKey = _encryptionService.Encrypt(dto.ApiKey);
                var encryptedApiSecret = _encryptionService.Encrypt(dto.ApiSecret);

                connection.ApiKey = encryptedApiKey;
                connection.ApiSecret = encryptedApiSecret;
                connection.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Exchange connection updated successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating exchange connection");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExchangeConnection(Guid id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var connection = await _context.ExchangeConnections
                    .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

                if (connection == null)
                    return NotFound(new { success = false, message = "Connection not found" });

                _context.ExchangeConnections.Remove(connection);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Exchange connection deleted successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting exchange connection");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("{id}/validate")]
        public async Task<IActionResult> ValidateConnection(Guid id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var connection = await _context.ExchangeConnections
                    .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

                if (connection == null)
                    return NotFound(new { success = false, message = "Connection not found" });

                // Decrypt API keys before validation
                string decryptedApiKey;
                string decryptedApiSecret;
                try
                {
                    decryptedApiKey = _encryptionService.Decrypt(connection.ApiKey);
                    decryptedApiSecret = _encryptionService.Decrypt(connection.ApiSecret);
                }
                catch
                {
                    // If decryption fails, try using as plain text (for backward compatibility)
                    decryptedApiKey = connection.ApiKey;
                    decryptedApiSecret = connection.ApiSecret;
                }

                var isValid = await _binanceService.ValidateCredentialsAsync(decryptedApiKey, decryptedApiSecret);

                return Ok(new { success = true, isValid, message = isValid ? "Connection is valid" : "Connection is invalid" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating exchange connection");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpGet("account")]
        public async Task<IActionResult> GetAccountInfo()
        {
            try
            {
                var userId = GetCurrentUserId();
                var accountInfo = await _binanceService.GetAccountInfoAsync(userId);

                if (accountInfo == null)
                    return NotFound(new { success = false, message = "No exchange connection found or unable to fetch account info" });

                return Ok(new { success = true, data = accountInfo });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account info");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpGet("price/{symbol}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSymbolPrice(string symbol)
        {
            try
            {
                var price = await _binanceService.GetSymbolPriceAsync(symbol);
                
                if (price == 0)
                    return NotFound(new { success = false, message = "Symbol not found or error fetching price" });

                return Ok(new { success = true, data = new { symbol, price } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting symbol price");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("prices")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMultiplePrices([FromBody] List<string> symbols)
        {
            try
            {
                var prices = await _binanceService.GetMultiplePricesAsync(symbols);
                return Ok(new { success = true, data = prices });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting multiple prices");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("orders")]
        public async Task<IActionResult> PlaceOrder([FromBody] PlaceOrderRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("📥 Received order request from user {UserId}", userId);
                _logger.LogInformation("📋 Request details: Symbol={Symbol}, Side={Side}, Type={Type}, Quantity={Quantity}, PositionSide={PositionSide}", 
                    request.Symbol, request.Side, request.Type, request.Quantity, request.PositionSide);

                if (string.IsNullOrEmpty(request.Symbol) || string.IsNullOrEmpty(request.Side) || string.IsNullOrEmpty(request.Quantity))
                {
                    _logger.LogWarning("❌ Invalid request: Missing required fields");
                    return BadRequest(new { message = "Symbol, Side, and Quantity are required" });
                }

                var result = await _binanceService.PlaceFuturesOrderAsync(userId, request);

                if (result == null)
                {
                    return BadRequest(new { message = "Failed to place order. Please check your API credentials and try again." });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing order");
                return StatusCode(500, new { message = "An error occurred while placing the order" });
            }
        }

        [HttpPost("leverage")]
        public async Task<IActionResult> SetLeverage([FromBody] SetLeverageRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("📥 Received leverage request from user {UserId}", userId);
                _logger.LogInformation("📋 Request details: Symbol={Symbol}, Leverage={Leverage}", 
                    request.Symbol, request.Leverage);

                if (string.IsNullOrEmpty(request.Symbol) || request.Leverage <= 0)
                {
                    _logger.LogWarning("❌ Invalid request: Missing required fields or invalid leverage");
                    return BadRequest(new { message = "Symbol and valid Leverage are required" });
                }

                var result = await _binanceService.SetLeverageAsync(userId, request);

                if (result == null)
                {
                    return BadRequest(new { message = "Failed to set leverage. Please check your API credentials and try again." });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting leverage");
                return StatusCode(500, new { message = "An error occurred while setting leverage" });
            }
        }

        private string MaskApiKey(string apiKey)
        {
            if (string.IsNullOrEmpty(apiKey) || apiKey.Length < 8)
                return "****";

            return $"{apiKey.Substring(0, 4)}...{apiKey.Substring(apiKey.Length - 4)}";
        }
    }
}

