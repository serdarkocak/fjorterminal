namespace FjorTerminal.Application.DTOs.CoinDetection
{
    public sealed class CoinCandidate
    {
        public string Ticker { get; set; } = "";
        public int Score { get; set; }
        public string Reason { get; set; } = "";
        public double? SimilarityScore { get; set; }
    }
}

