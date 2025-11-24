namespace FjorTerminal.Application.DTOs.Binance
{
    public class PlaceOrderRequestDto
    {
        public string Symbol { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty; // BUY or SELL
        public string Type { get; set; } = "MARKET"; // MARKET or LIMIT
        public string Quantity { get; set; } = string.Empty;
        public string? PositionSide { get; set; } // LONG or SHORT (for hedge mode)
    }
}

