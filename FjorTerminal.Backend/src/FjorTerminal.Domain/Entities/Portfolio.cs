using System;

namespace FjorTerminal.Domain.Entities
{
    public class Portfolio
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public decimal TotalBalance { get; set; }
        public decimal AvailableBalance { get; set; }
        public decimal InPositions { get; set; } = 0;
        public decimal TotalPnl { get; set; } = 0;
        public decimal DailyPnl { get; set; } = 0;
        public decimal MonthlyPnl { get; set; } = 0;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public User User { get; set; } = null!;
    }
}

