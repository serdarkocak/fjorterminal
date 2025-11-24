using System;

namespace FjorTerminal.Domain.Entities
{
    public class TradingBot
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string BotType { get; set; } = string.Empty; // DCA, GRID, TRAILING
        public string Symbol { get; set; } = string.Empty;
        public string Configuration { get; set; } = string.Empty; // JSON
        public bool IsActive { get; set; } = false;
        public int TotalTrades { get; set; } = 0;
        public decimal TotalPnl { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties
        public User User { get; set; } = null!;
    }
}

