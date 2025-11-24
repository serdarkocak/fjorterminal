namespace FjorTerminal.Application.DTOs.Binance
{
    public class SetLeverageResponseDto
    {
        public int Leverage { get; set; }
        public string Symbol { get; set; } = string.Empty;
        public decimal MaxNotionalValue { get; set; }
    }
}

