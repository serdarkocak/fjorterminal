namespace FjorTerminal.Application.DTOs.Portfolio
{
    public class PortfolioSummaryDto
    {
        public decimal TotalBalance { get; set; }
        public decimal AvailableBalance { get; set; }
        public decimal InPositions { get; set; }
        public decimal TotalPnl { get; set; }
        public decimal TotalPnlPercentage { get; set; }
        public decimal DailyPnl { get; set; }
        public decimal DailyPnlPercentage { get; set; }
        public decimal WeeklyPnl { get; set; }
        public decimal WeeklyPnlPercentage { get; set; }
        public decimal MonthlyPnl { get; set; }
        public decimal MonthlyPnlPercentage { get; set; }
        public int TotalTrades { get; set; }
        public int WinningTrades { get; set; }
        public int LosingTrades { get; set; }
        public decimal WinRate { get; set; }
        public decimal AverageWin { get; set; }
        public decimal AverageLoss { get; set; }
        public decimal ProfitFactor { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class TradeHistoryDto
    {
        public Guid Id { get; set; }
        public string Symbol { get; set; } = string.Empty;
        public string Side { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal? Price { get; set; }
        public int? Leverage { get; set; }
        public string? OrderId { get; set; }
        public string? Status { get; set; }
        public decimal? Commission { get; set; }
        public decimal? RealizedPnl { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExecutedAt { get; set; }
    }

    public class TradeHistoryFilterDto
    {
        public string? Symbol { get; set; }
        public string? Side { get; set; }
        public string? Type { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    public class PaginatedTradeHistoryDto
    {
        public List<TradeHistoryDto> Trades { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class DailyPnlDto
    {
        public DateTime Date { get; set; }
        public decimal Pnl { get; set; }
        public decimal PnlPercentage { get; set; }
        public int TradeCount { get; set; }
        public int WinCount { get; set; }
        public int LossCount { get; set; }
    }

    public class PerformanceMetricsDto
    {
        public decimal TotalReturn { get; set; }
        public decimal TotalReturnPercentage { get; set; }
        public decimal MaxDrawdown { get; set; }
        public decimal MaxDrawdownPercentage { get; set; }
        public decimal SharpeRatio { get; set; }
        public decimal AverageDailyReturn { get; set; }
        public decimal BestDay { get; set; }
        public decimal WorstDay { get; set; }
        public int TotalTradingDays { get; set; }
        public int ProfitableDays { get; set; }
        public int UnprofitableDays { get; set; }
        public List<DailyPnlDto> DailyPnls { get; set; } = new();
    }
}

