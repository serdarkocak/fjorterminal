using FjorTerminal.Domain.Entities;
using FjorTerminal.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FjorTerminal.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UserSettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserSettingsController> _logger;

        public UserSettingsController(ApplicationDbContext context, ILogger<UserSettingsController> _logger)
        {
            _context = context;
            this._logger = _logger;
        }

        private Guid GetCurrentUserId()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedAccessException("User not authenticated");
            }
            if (!Guid.TryParse(userId, out var guidUserId))
            {
                throw new UnauthorizedAccessException("Invalid user ID format");
            }
            return guidUserId;
        }

        // GET: api/UserSettings
        [HttpGet]
        public async Task<IActionResult> GetUserSettings()
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("Getting settings for user: {UserId}", userId);

                var settings = await _context.UserSettings
                    .FirstOrDefaultAsync(s => s.UserId == userId);

                if (settings == null)
                {
                    // Return default settings if none exist
                    _logger.LogInformation("No settings found for user {UserId}, returning defaults", userId);
                    return Ok(new
                    {
                        tickerShortcuts = "[]",
                        positionSettings = "{}",
                        leverageSettings = "{}",
                        cryptoDetectedCoins = "[]"
                    });
                }

                return Ok(new
                {
                    tickerShortcuts = settings.TickerShortcuts ?? "[]",
                    positionSettings = settings.PositionSettings ?? "{}",
                    leverageSettings = settings.LeverageSettings ?? "{}",
                    cryptoDetectedCoins = settings.CryptoDetectedCoins ?? "[]"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Unauthorized access: {Message}", ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user settings");
                return StatusCode(500, new { message = "Failed to get user settings" });
            }
        }

        // PUT: api/UserSettings
        [HttpPut]
        public async Task<IActionResult> UpdateUserSettings([FromBody] UpdateUserSettingsRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("Updating settings for user: {UserId}", userId);

                var settings = await _context.UserSettings
                    .FirstOrDefaultAsync(s => s.UserId == userId);

                if (settings == null)
                {
                    // Create new settings
                    settings = new UserSettings
                    {
                        UserId = userId,
                        TickerShortcuts = request.TickerShortcuts,
                        PositionSettings = request.PositionSettings,
                        LeverageSettings = request.LeverageSettings,
                        CryptoDetectedCoins = request.CryptoDetectedCoins,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.UserSettings.Add(settings);
                    _logger.LogInformation("Created new settings for user {UserId}", userId);
                }
                else
                {
                    // Update existing settings
                    if (request.TickerShortcuts != null) settings.TickerShortcuts = request.TickerShortcuts;
                    if (request.PositionSettings != null) settings.PositionSettings = request.PositionSettings;
                    if (request.LeverageSettings != null) settings.LeverageSettings = request.LeverageSettings;
                    if (request.CryptoDetectedCoins != null) settings.CryptoDetectedCoins = request.CryptoDetectedCoins;
                    settings.UpdatedAt = DateTime.UtcNow;
                    _logger.LogInformation("Updated existing settings for user {UserId}", userId);
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Settings updated successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Unauthorized access: {Message}", ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user settings");
                return StatusCode(500, new { message = "Failed to update user settings" });
            }
        }

        // DELETE: api/UserSettings
        [HttpDelete]
        public async Task<IActionResult> DeleteUserSettings()
        {
            try
            {
                var userId = GetCurrentUserId();
                _logger.LogInformation("Deleting settings for user: {UserId}", userId);

                var settings = await _context.UserSettings
                    .FirstOrDefaultAsync(s => s.UserId == userId);

                if (settings != null)
                {
                    _context.UserSettings.Remove(settings);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Deleted settings for user {UserId}", userId);
                }

                return Ok(new { message = "Settings deleted successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Unauthorized access: {Message}", ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user settings");
                return StatusCode(500, new { message = "Failed to delete user settings" });
            }
        }
    }

    public class UpdateUserSettingsRequest
    {
        public string? TickerShortcuts { get; set; }
        public string? PositionSettings { get; set; }
        public string? LeverageSettings { get; set; }
        public string? CryptoDetectedCoins { get; set; }
    }
}

