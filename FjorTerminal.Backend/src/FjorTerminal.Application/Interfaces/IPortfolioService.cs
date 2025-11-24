using FjorTerminal.Application.DTOs.Portfolio;

namespace FjorTerminal.Application.Interfaces
{
    public interface IPortfolioService
    {
        Task<PortfolioSummaryDto?> GetPortfolioSummaryAsync(Guid userId);
        Task<PaginatedTradeHistoryDto> GetTradeHistoryAsync(Guid userId, TradeHistoryFilterDto filter);
        Task<PerformanceMetricsDto> GetPerformanceMetricsAsync(Guid userId, int days = 30);
        Task<List<DailyPnlDto>> GetDailyPnlAsync(Guid userId, int days = 30);
        Task UpdatePortfolioAsync(Guid userId);
    }
}

