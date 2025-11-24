using System;
using System.Collections.Generic;

namespace FjorTerminal.Domain.Entities
{
    public class User
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public bool TwoFactorEnabled { get; set; } = false;
        public string? TwoFactorSecret { get; set; }
        public bool EmailConfirmed { get; set; } = false;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public string? PasswordResetCode { get; set; }
        public DateTime? PasswordResetCodeExpiry { get; set; }

        // Navigation Properties
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
        public ICollection<ExchangeConnection> ExchangeConnections { get; set; } = new List<ExchangeConnection>();
        public ICollection<Trade> Trades { get; set; } = new List<Trade>();
        public ICollection<Position> Positions { get; set; } = new List<Position>();
        public Portfolio? Portfolio { get; set; }
        public ICollection<TradingBot> TradingBots { get; set; } = new List<TradingBot>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    }
}

