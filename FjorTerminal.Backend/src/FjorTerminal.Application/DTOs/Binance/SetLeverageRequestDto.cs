namespace FjorTerminal.Application.DTOs.Binance
{
    public class SetLeverageRequestDto
    {
        public string Symbol { get; set; } = string.Empty;
        public int Leverage { get; set; }
    }
}

