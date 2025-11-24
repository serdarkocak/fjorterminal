using FjorTerminal.Application.Models.CoinDetection;

namespace FjorTerminal.Application.Interfaces
{
    public interface IBinanceFuturesIndexService
    {
        Task<FuturesIndex> GetIndexAsync(CancellationToken cancellationToken = default);
        Task<FuturesIndex> RefreshIndexAsync(CancellationToken cancellationToken = default);
    }
}

