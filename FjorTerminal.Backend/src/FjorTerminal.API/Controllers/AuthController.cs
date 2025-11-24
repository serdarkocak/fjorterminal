using FjorTerminal.Application.DTOs.Auth;
using FjorTerminal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FjorTerminal.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            try
            {
                var response = await _authService.RegisterAsync(request);
                return Ok(new { success = true, data = response });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Registration failed for email: {Email}", request.Email);
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during registration");
                return StatusCode(500, new { success = false, message = "An error occurred during registration" });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            try
            {
                var response = await _authService.LoginAsync(request);
                return Ok(new { success = true, data = response });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Login failed for email: {Email}", request.Email);
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during login");
                return StatusCode(500, new { success = false, message = "An error occurred during login" });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request)
        {
            try
            {
                var response = await _authService.RefreshTokenAsync(request.AccessToken, request.RefreshToken);
                return Ok(new { success = true, data = response });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Token refresh failed");
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during token refresh");
                return StatusCode(500, new { success = false, message = "An error occurred during token refresh" });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                                ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized(new { success = false, message = "Invalid user" });

                await _authService.LogoutAsync(userId);
                return Ok(new { success = true, message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during logout");
                return StatusCode(500, new { success = false, message = "An error occurred during logout" });
            }
        }

        [HttpPost("revoke")]
        [Authorize]
        public async Task<IActionResult> RevokeToken([FromBody] string refreshToken)
        {
            try
            {
                var result = await _authService.RevokeTokenAsync(refreshToken);
                if (result)
                    return Ok(new { success = true, message = "Token revoked successfully" });
                
                return BadRequest(new { success = false, message = "Token not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during token revocation");
                return StatusCode(500, new { success = false, message = "An error occurred during token revocation" });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
        {
            try
            {
                var result = await _authService.ForgotPasswordAsync(request);
                // Always return success to prevent email enumeration
                return Ok(new { success = true, message = "If the email exists, a password reset code has been sent." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during forgot password");
                return StatusCode(500, new { success = false, message = "An error occurred during password reset request" });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
        {
            try
            {
                var result = await _authService.ResetPasswordAsync(request);
                return Ok(new { success = true, message = "Password has been reset successfully" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Password reset failed");
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during password reset");
                return StatusCode(500, new { success = false, message = "An error occurred during password reset" });
            }
        }
    }

    public class RefreshTokenRequestDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
    }
}

