namespace FjorTerminal.Application.Interfaces
{
    public interface ICoinSemanticIndex
    {
        Dictionary<string, float[]> TickerEmbeddings { get; }
        Task InitializeAsync(CancellationToken cancellationToken = default);
        Task RefreshAsync(CancellationToken cancellationToken = default);
    }
}

