using FjorTerminal.Application.DTOs.User;

namespace FjorTerminal.Application.Interfaces
{
    public interface IUserService
    {
        Task<UserProfileDto?> GetProfileAsync(Guid userId);
        Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);
        Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
        Task<bool> DeleteAccountAsync(Guid userId);
        Task<bool> Enable2FAAsync(Guid userId);
        Task<bool> Disable2FAAsync(Guid userId);
    }
}

