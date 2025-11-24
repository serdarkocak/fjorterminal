using System;

namespace FjorTerminal.Domain.Entities
{
    public class Trade
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid ExchangeConnectionId { get; set; }
        public string Symbol { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty; // BUY, SELL
        public string Type { get; set; } = string.Empty; // MARKET, LIMIT
        public decimal Quantity { get; set; }
        public decimal? Price { get; set; }
        public int Leverage { get; set; } = 1;
        public string? OrderId { get; set; }
        public string? Status { get; set; } // FILLED, CANCELLED, PENDING
        public decimal? Commission { get; set; }
        public decimal? RealizedPnl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ExecutedAt { get; set; }

        // Navigation Properties
        public User User { get; set; } = null!;
        public ExchangeConnection ExchangeConnection { get; set; } = null!;
    }
}

