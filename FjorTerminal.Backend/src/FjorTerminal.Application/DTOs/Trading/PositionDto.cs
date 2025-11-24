namespace FjorTerminal.Application.DTOs.Trading
{
    public class PositionDto
    {
        public string Symbol { get; set; } = string.Empty;
        public string PositionSide { get; set; } = string.Empty; // LONG, SHORT, BOTH
        public decimal PositionAmt { get; set; }
        public decimal EntryPrice { get; set; }
        public decimal MarkPrice { get; set; }
        public decimal UnrealizedProfit { get; set; }
        public decimal LiquidationPrice { get; set; }
        public int Leverage { get; set; }
        public string MarginType { get; set; } = string.Empty; // "cross" or "isolated"
        public decimal IsolatedMargin { get; set; }
        public decimal IsolatedWallet { get; set; }
        public decimal Notional { get; set; }
        public bool IsAutoAddMargin { get; set; }
        public DateTime UpdateTime { get; set; }
    }

    public class ClosePositionDto
    {
        public string Symbol { get; set; } = string.Empty;
        public decimal? Quantity { get; set; } // null = close all
    }

    public class SetLeverageDto
    {
        public string Symbol { get; set; } = string.Empty;
        public int Leverage { get; set; }
    }
}

