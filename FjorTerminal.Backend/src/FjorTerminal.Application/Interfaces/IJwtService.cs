using FjorTerminal.Domain.Entities;
using System.Security.Claims;

namespace FjorTerminal.Application.Interfaces
{
    public interface IJwtService
    {
        string GenerateAccessToken(User user, List<string> roles);
        string GenerateRefreshToken();
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
        Guid? GetUserIdFromToken(string token);
    }
}

