using FjorTerminal.Application.DTOs.Portfolio;
using FjorTerminal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FjorTerminal.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    public class PortfolioController : ControllerBase
    {
        private readonly IPortfolioService _portfolioService;
        private readonly ILogger<PortfolioController> _logger;

        public PortfolioController(IPortfolioService portfolioService, ILogger<PortfolioController> logger)
        {
            _portfolioService = portfolioService;
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

        [HttpGet("summary")]
        public async Task<IActionResult> GetPortfolioSummary()
        {
            try
            {
                var userId = GetCurrentUserId();
                var summary = await _portfolioService.GetPortfolioSummaryAsync(userId);

                if (summary == null)
                    return NotFound(new { success = false, message = "Portfolio not found" });

                return Ok(new { success = true, data = summary });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting portfolio summary");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpGet("trades")]
        public async Task<IActionResult> GetTradeHistory([FromQuery] TradeHistoryFilterDto filter)
        {
            try
            {
                var userId = GetCurrentUserId();
                var history = await _portfolioService.GetTradeHistoryAsync(userId, filter);

                return Ok(new { success = true, data = history });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting trade history");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpGet("performance")]
        public async Task<IActionResult> GetPerformanceMetrics([FromQuery] int days = 30)
        {
            try
            {
                var userId = GetCurrentUserId();
                var metrics = await _portfolioService.GetPerformanceMetricsAsync(userId, days);

                return Ok(new { success = true, data = metrics });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting performance metrics");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpGet("daily-pnl")]
        public async Task<IActionResult> GetDailyPnl([FromQuery] int days = 30)
        {
            try
            {
                var userId = GetCurrentUserId();
                var dailyPnl = await _portfolioService.GetDailyPnlAsync(userId, days);

                return Ok(new { success = true, data = dailyPnl });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting daily PnL");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("update")]
        public async Task<IActionResult> UpdatePortfolio()
        {
            try
            {
                var userId = GetCurrentUserId();
                await _portfolioService.UpdatePortfolioAsync(userId);

                return Ok(new { success = true, message = "Portfolio updated successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating portfolio");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }
    }
}

