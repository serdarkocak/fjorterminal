namespace FjorTerminal.Application.DTOs.Trading
{
    public class MarketOrderDto
    {
        public string Symbol { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty; // BUY, SELL
        public decimal Quantity { get; set; }
        public int? Leverage { get; set; }
        public string? PositionSide { get; set; } // LONG, SHORT (for Hedge mode)
    }

    public class LimitOrderDto
    {
        public string Symbol { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty; // BUY, SELL
        public decimal Quantity { get; set; }
        public decimal Price { get; set; }
        public int? Leverage { get; set; }
        public string? PositionSide { get; set; } // LONG, SHORT (for Hedge mode)
    }

    public class StopLossOrderDto
    {
        public string Symbol { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty; // SELL for long, BUY for short
        public decimal Quantity { get; set; }
        public decimal StopPrice { get; set; }
    }

    public class TakeProfitOrderDto
    {
        public string Symbol { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty; // SELL for long, BUY for short
        public decimal Quantity { get; set; }
        public decimal StopPrice { get; set; }
    }

    public class OrderResponseDto
    {
        public string OrderId { get; set; } = string.Empty;
        public string Symbol { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal? Price { get; set; }
        public decimal? ExecutedQuantity { get; set; }
        public DateTime CreateTime { get; set; }
        public DateTime? UpdateTime { get; set; }
    }
}

