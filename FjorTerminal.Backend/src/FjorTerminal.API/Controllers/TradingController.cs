using FjorTerminal.Application.DTOs.Trading;
using FjorTerminal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FjorTerminal.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    public class TradingController : ControllerBase
    {
        private readonly ITradingService _tradingService;
        private readonly ILogger<TradingController> _logger;

        public TradingController(ITradingService tradingService, ILogger<TradingController> logger)
        {
            _tradingService = tradingService;
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

        [HttpPost("orders/market")]
        public async Task<IActionResult> PlaceMarketOrder([FromBody] MarketOrderDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _tradingService.PlaceMarketOrderAsync(userId, dto);

                if (result == null)
                    return BadRequest(new { success = false, message = "Failed to place market order" });

                return Ok(new { success = true, data = result, message = "Market order placed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing market order");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("orders/limit")]
        public async Task<IActionResult> PlaceLimitOrder([FromBody] LimitOrderDto dto)
        {
            try
            {
                _logger.LogInformation("📥 Limit order request received: Symbol={Symbol}, Side={Side}, Quantity={Quantity}, Price={Price}, PositionSide={PositionSide}", 
                    dto.Symbol, dto.Side, dto.Quantity, dto.Price, dto.PositionSide ?? "N/A");
                
                if (string.IsNullOrEmpty(dto.Symbol))
                {
                    _logger.LogWarning("❌ Symbol is required");
                    return BadRequest(new { success = false, message = "Symbol is required" });
                }
                
                if (string.IsNullOrEmpty(dto.Side))
                {
                    _logger.LogWarning("❌ Side is required");
                    return BadRequest(new { success = false, message = "Side is required" });
                }
                
                if (dto.Quantity <= 0)
                {
                    _logger.LogWarning("❌ Quantity must be greater than 0");
                    return BadRequest(new { success = false, message = "Quantity must be greater than 0" });
                }
                
                if (dto.Price <= 0)
                {
                    _logger.LogWarning("❌ Price must be greater than 0");
                    return BadRequest(new { success = false, message = "Price must be greater than 0" });
                }
                
                var userId = GetCurrentUserId();
                var result = await _tradingService.PlaceLimitOrderAsync(userId, dto);

                if (result == null)
                    return BadRequest(new { success = false, message = "Failed to place limit order" });

                return Ok(new { success = true, data = result, message = "Limit order placed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing limit order");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("orders/stop-loss")]
        public async Task<IActionResult> PlaceStopLoss([FromBody] StopLossOrderDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _tradingService.PlaceStopLossOrderAsync(userId, dto);

                if (result == null)
                    return BadRequest(new { success = false, message = "Failed to place stop loss order" });

                return Ok(new { success = true, data = result, message = "Stop loss order placed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing stop loss order");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("orders/take-profit")]
        public async Task<IActionResult> PlaceTakeProfit([FromBody] TakeProfitOrderDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _tradingService.PlaceTakeProfitOrderAsync(userId, dto);

                if (result == null)
                    return BadRequest(new { success = false, message = "Failed to place take profit order" });

                return Ok(new { success = true, data = result, message = "Take profit order placed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing take profit order");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpDelete("orders/{symbol}/{orderId}")]
        public async Task<IActionResult> CancelOrder(string symbol, string orderId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _tradingService.CancelOrderAsync(userId, symbol, orderId);

                if (!result)
                    return BadRequest(new { success = false, message = "Failed to cancel order" });

                return Ok(new { success = true, message = "Order cancelled successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error canceling order");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpGet("orders")]
        public async Task<IActionResult> GetOpenOrders([FromQuery] string? symbol = null)
        {
            try
            {
                var userId = GetCurrentUserId();
                var orders = await _tradingService.GetOpenOrdersAsync(userId, symbol);

                return Ok(new { success = true, data = orders });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting open orders");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpGet("positions")]
        public async Task<IActionResult> GetPositions()
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("📍 GetPositions endpoint called for userId: {UserId}", userId);
                
                var positions = await _tradingService.GetPositionsAsync(userId);

                _logger.LogInformation("✅ Returning {Count} positions to frontend", positions.Count);
                
                return Ok(new { success = true, data = positions });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("⚠️ Unauthorized access to GetPositions: {Message}", ex.Message);
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error getting positions in controller: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("positions/close")]
        public async Task<IActionResult> ClosePosition([FromBody] ClosePositionDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("📥 Close position request from user {UserId}: Symbol={Symbol}, Quantity={Quantity}", 
                    userId, dto?.Symbol, dto?.Quantity);
                
                if (dto == null || string.IsNullOrEmpty(dto.Symbol))
                {
                    _logger.LogWarning("❌ Invalid close position request: dto is null or symbol is empty");
                    return BadRequest(new { success = false, message = "Symbol is required" });
                }

                var result = await _tradingService.ClosePositionAsync(userId, dto);

                if (!result)
                {
                    _logger.LogWarning("⚠️ Failed to close position {Symbol}", dto.Symbol);
                    return BadRequest(new { success = false, message = "Failed to close position" });
                }

                _logger.LogInformation("✅ Position {Symbol} closed successfully", dto.Symbol);
                return Ok(new { success = true, message = "Position closed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing position");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("leverage")]
        public async Task<IActionResult> SetLeverage([FromBody] SetLeverageDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _tradingService.SetLeverageAsync(userId, dto);

                if (!result)
                    return BadRequest(new { success = false, message = "Failed to set leverage" });

                return Ok(new { success = true, message = "Leverage set successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting leverage");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }
    }
}

