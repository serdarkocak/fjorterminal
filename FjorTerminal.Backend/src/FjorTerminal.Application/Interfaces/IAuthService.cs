using FjorTerminal.Application.DTOs.Auth;

namespace FjorTerminal.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request);
        Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
        Task<AuthResponseDto> RefreshTokenAsync(string accessToken, string refreshToken);
        Task<bool> RevokeTokenAsync(string refreshToken);
        Task<bool> LogoutAsync(Guid userId);
        Task<bool> ForgotPasswordAsync(ForgotPasswordRequestDto request);
        Task<bool> ResetPasswordAsync(ResetPasswordRequestDto request);
    }
}

