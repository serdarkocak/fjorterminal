namespace FjorTerminal.Application.Interfaces
{
    public interface IEmailService
    {
        Task<bool> SendPasswordResetCodeAsync(string email, string resetCode);
    }
}

