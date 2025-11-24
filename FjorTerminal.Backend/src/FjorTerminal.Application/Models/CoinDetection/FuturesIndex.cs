namespace FjorTerminal.Application.Models.CoinDetection
{
    public sealed class FuturesIndex
    {
        public HashSet<string> BaseAssets { get; init; } = new(StringComparer.OrdinalIgnoreCase);
        public HashSet<string> Symbols { get; init; } = new(StringComparer.OrdinalIgnoreCase);

        // full name / alias -> ticker
        public Dictionary<string, string> NameToTicker { get; init; } = new(StringComparer.OrdinalIgnoreCase);

        // ticker -> list of aliases/full names (for embedding descriptions)
        public Dictionary<string, List<string>> TickerAliases { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    }
}

