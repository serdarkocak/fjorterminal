namespace FjorTerminal.Application.DTOs.CoinDetection
{
    public sealed class AnalyzeNewsRequest
    {
        public List<NewsItemDto> Items { get; set; } = new();
    }
}

