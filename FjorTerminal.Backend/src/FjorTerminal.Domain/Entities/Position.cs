using System;

namespace FjorTerminal.Domain.Entities
{
    public class Position
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Symbol { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty; // LONG, SHORT
        public decimal EntryPrice { get; set; }
        public decimal? CurrentPrice { get; set; }
        public decimal Quantity { get; set; }
        public int Leverage { get; set; }
        public decimal Margin { get; set; }
        public decimal? UnrealizedPnl { get; set; }
        public decimal? RealizedPnl { get; set; }
        public decimal? StopLoss { get; set; }
        public decimal? TakeProfit { get; set; }
        public bool IsOpen { get; set; } = true;
        public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ClosedAt { get; set; }

        // Navigation Properties
        public User User { get; set; } = null!;
    }
}

