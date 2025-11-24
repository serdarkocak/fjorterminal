namespace FjorTerminal.Application.DTOs.Binance
{
    public class PlaceOrderResponseDto
    {
        public long OrderId { get; set; }
        public string Symbol { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string OrigQty { get; set; } = string.Empty;
        public string ExecutedQty { get; set; } = string.Empty;
        public string AvgPrice { get; set; } = string.Empty;
        public string CumQuote { get; set; } = string.Empty;
    }
}

