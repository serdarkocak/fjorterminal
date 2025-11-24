using FjorTerminal.Application.DTOs.User;
using FjorTerminal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FjorTerminal.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ILogger<UsersController> _logger;

        public UsersController(IUserService userService, ILogger<UsersController> logger)
        {
            _userService = userService;
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

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userId = GetCurrentUserId();
                var profile = await _userService.GetProfileAsync(userId);

                if (profile == null)
                    return NotFound(new { success = false, message = "User not found" });

                return Ok(new { success = true, data = profile });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user profile");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var updatedProfile = await _userService.UpdateProfileAsync(userId, dto);

                return Ok(new { success = true, data = updatedProfile, message = "Profile updated successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Failed to update profile");
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user profile");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPut("password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _userService.ChangePasswordAsync(userId, dto);

                return Ok(new { success = true, message = "Password changed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Failed to change password");
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpDelete("account")]
        public async Task<IActionResult> DeleteAccount()
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _userService.DeleteAccountAsync(userId);

                if (!result)
                    return NotFound(new { success = false, message = "User not found" });

                return Ok(new { success = true, message = "Account deleted successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("2fa/enable")]
        public async Task<IActionResult> Enable2FA()
        {
            try
            {
                var userId = GetCurrentUserId();
                await _userService.Enable2FAAsync(userId);

                return Ok(new { success = true, message = "2FA enabled successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Failed to enable 2FA");
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enabling 2FA");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }

        [HttpPost("2fa/disable")]
        public async Task<IActionResult> Disable2FA()
        {
            try
            {
                var userId = GetCurrentUserId();
                await _userService.Disable2FAAsync(userId);

                return Ok(new { success = true, message = "2FA disabled successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Failed to disable 2FA");
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disabling 2FA");
                return StatusCode(500, new { success = false, message = "An error occurred" });
            }
        }
    }
}

