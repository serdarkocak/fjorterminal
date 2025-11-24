using FjorTerminal.Application.Models.CoinDetection;

namespace FjorTerminal.Application.Interfaces
{
    public interface ICoinDetectorV2
    {
        Task<CoinDetectionResult> DetectAsync(string title, string description, CancellationToken cancellationToken = default);
    }
}

