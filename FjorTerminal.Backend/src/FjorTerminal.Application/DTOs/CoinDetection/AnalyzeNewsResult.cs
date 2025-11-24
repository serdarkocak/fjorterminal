namespace FjorTerminal.Application.DTOs.CoinDetection
{
    public sealed class AnalyzeNewsResult
    {
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public string Coin { get; set; } = "NONE";
        public double Score { get; set; }
        public string Source { get; set; } = ""; // "deterministic", "embedding", "embedding+deterministic", "llm"
        public string? Reasoning { get; set; }
    }
}

