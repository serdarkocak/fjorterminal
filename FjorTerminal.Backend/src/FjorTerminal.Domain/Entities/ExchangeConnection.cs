using System;

namespace FjorTerminal.Domain.Entities
{
    public class ExchangeConnection
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string ExchangeName { get; set; } = string.Empty; // Binance, etc.
        public string ApiKey { get; set; } = string.Empty; // Encrypted
        public string ApiSecret { get; set; } = string.Empty; // Encrypted
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties
        public User User { get; set; } = null!;
    }
}

