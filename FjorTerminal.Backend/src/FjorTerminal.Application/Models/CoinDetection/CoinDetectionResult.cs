namespace FjorTerminal.Application.Models.CoinDetection
{
    public sealed class CoinDetectionResult
    {
        public string Coin { get; set; } = "NONE";
        public double Score { get; set; }
        public string Source { get; set; } = ""; // "deterministic", "embedding", "embedding+deterministic", "llm"
        public string? Reasoning { get; set; }
    }
}

