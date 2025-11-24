using FjorTerminal.Application.DTOs.Auth;
using FjorTerminal.Application.Interfaces;
using FjorTerminal.Domain.Entities;
using FjorTerminal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using BCrypt.Net;

namespace FjorTerminal.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly int _refreshTokenExpirationDays;

        public AuthService(
            ApplicationDbContext context,
            IJwtService jwtService,
            IConfiguration configuration,
            IEmailService emailService)
        {
            _context = context;
            _jwtService = jwtService;
            _configuration = configuration;
            _emailService = emailService;
            _refreshTokenExpirationDays = int.Parse(_configuration["JwtSettings:RefreshTokenExpirationDays"] ?? "7");
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
        {
            // Validate
            if (request.Password != request.ConfirmPassword)
                throw new InvalidOperationException("Passwords do not match");

            // Check if user exists
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                throw new InvalidOperationException("Email already exists");

            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                throw new InvalidOperationException("Username already exists");

            // Create user
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = request.Email,
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FirstName = request.FirstName,
                LastName = request.LastName,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                EmailConfirmed = false
            };

            _context.Users.Add(user);

            // Add default role
            var userRole = new UserRole
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Role = "User",
                CreatedAt = DateTime.UtcNow
            };

            _context.UserRoles.Add(userRole);

            // Create portfolio
            var portfolio = new Portfolio
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TotalBalance = 0,
                AvailableBalance = 0,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Portfolios.Add(portfolio);

            await _context.SaveChangesAsync();

            // Generate tokens
            var roles = new List<string> { "User" };
            var accessToken = _jwtService.GenerateAccessToken(user, roles);
            var refreshToken = _jwtService.GenerateRefreshToken();

            // Save refresh token
            var refreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenExpirationDays),
                CreatedAt = DateTime.UtcNow
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_configuration["JwtSettings:AccessTokenExpirationMinutes"] ?? "15")),
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Username = user.Username,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Roles = roles
                }
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
        {
            // Find user
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
                throw new InvalidOperationException("Invalid email or password");

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                throw new InvalidOperationException("Invalid email or password");

            // Check if user is active
            if (!user.IsActive)
                throw new InvalidOperationException("User account is inactive");

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Get roles
            var roles = user.UserRoles.Select(r => r.Role).ToList();

            // Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(user, roles);
            var refreshToken = _jwtService.GenerateRefreshToken();

            // Save refresh token
            var refreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenExpirationDays),
                CreatedAt = DateTime.UtcNow
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_configuration["JwtSettings:AccessTokenExpirationMinutes"] ?? "15")),
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Username = user.Username,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Roles = roles
                }
            };
        }

        public async Task<AuthResponseDto> RefreshTokenAsync(string accessToken, string refreshToken)
        {
            // Get user id from expired token
            var userId = _jwtService.GetUserIdFromToken(accessToken);
            if (userId == null)
                throw new InvalidOperationException("Invalid token");

            // Find refresh token
            var storedRefreshToken = await _context.RefreshTokens
                .Include(rt => rt.User)
                    .ThenInclude(u => u.UserRoles)
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken && rt.UserId == userId);

            if (storedRefreshToken == null || !storedRefreshToken.IsActive)
                throw new InvalidOperationException("Invalid or expired refresh token");

            // Revoke old refresh token
            storedRefreshToken.IsRevoked = true;
            storedRefreshToken.RevokedAt = DateTime.UtcNow;

            // Get roles
            var roles = storedRefreshToken.User.UserRoles.Select(r => r.Role).ToList();

            // Generate new tokens
            var newAccessToken = _jwtService.GenerateAccessToken(storedRefreshToken.User, roles);
            var newRefreshToken = _jwtService.GenerateRefreshToken();

            // Save new refresh token
            var newRefreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = storedRefreshToken.UserId,
                Token = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenExpirationDays),
                CreatedAt = DateTime.UtcNow
            };

            _context.RefreshTokens.Add(newRefreshTokenEntity);
            await _context.SaveChangesAsync();

            return new AuthResponseDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_configuration["JwtSettings:AccessTokenExpirationMinutes"] ?? "15")),
                User = new UserDto
                {
                    Id = storedRefreshToken.User.Id,
                    Email = storedRefreshToken.User.Email,
                    Username = storedRefreshToken.User.Username,
                    FirstName = storedRefreshToken.User.FirstName,
                    LastName = storedRefreshToken.User.LastName,
                    Roles = roles
                }
            };
        }

        public async Task<bool> RevokeTokenAsync(string refreshToken)
        {
            var storedRefreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

            if (storedRefreshToken == null)
                return false;

            storedRefreshToken.IsRevoked = true;
            storedRefreshToken.RevokedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LogoutAsync(Guid userId)
        {
            // Revoke all active refresh tokens for user
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            foreach (var token in activeTokens)
            {
                token.IsRevoked = true;
                token.RevokedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ForgotPasswordAsync(ForgotPasswordRequestDto request)
        {
            try
            {
                // Find user by email
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == request.Email);

                // Always return true to prevent email enumeration
                if (user == null || !user.IsActive)
                    return true;

                // Generate 6-digit reset code
                var random = new Random();
                var resetCode = random.Next(100000, 999999).ToString();

                // Save reset code and expiry (15 minutes)
                user.PasswordResetCode = resetCode;
                user.PasswordResetCodeExpiry = DateTime.UtcNow.AddMinutes(15);
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Send email (don't throw exception if email fails - log it)
                try
                {
                    var emailSent = await _emailService.SendPasswordResetCodeAsync(user.Email, resetCode);
                    if (!emailSent)
                    {
                        // Log warning but don't fail the request
                        // The reset code is saved, user can still use it
                        // In production, you might want to queue the email for retry
                    }
                }
                catch (Exception emailEx)
                {
                    // Log email error but don't fail the password reset request
                    // The code is already saved, user can request a new one if needed
                    // In a production environment, you might want to use a background job queue
                    // Note: EmailService should not throw exceptions, but we catch just in case
                }

                return true;
            }
            catch (Exception ex)
            {
                // Log the error but still return true to prevent email enumeration
                // This ensures we don't reveal whether an email exists or not
                // In production, you might want to log to a monitoring service
                // Note: We catch all exceptions here to ensure we always return true
                // for security reasons (prevent email enumeration)
                return true;
            }
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordRequestDto request)
        {
            // Validate passwords match
            if (request.NewPassword != request.ConfirmPassword)
                throw new InvalidOperationException("Passwords do not match");

            // Find user by email
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
                throw new InvalidOperationException("Invalid email or reset code");

            // Validate reset code
            if (string.IsNullOrEmpty(user.PasswordResetCode) || 
                user.PasswordResetCode != request.ResetCode)
                throw new InvalidOperationException("Invalid reset code");

            // Check if code expired
            if (user.PasswordResetCodeExpiry == null || 
                user.PasswordResetCodeExpiry < DateTime.UtcNow)
                throw new InvalidOperationException("Reset code has expired");

            // Validate password length
            if (request.NewPassword.Length < 6)
                throw new InvalidOperationException("Password must be at least 6 characters");

            // Update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.PasswordResetCode = null;
            user.PasswordResetCodeExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }
    }
}

