using FjorTerminal.Application.DTOs.Portfolio;
using FjorTerminal.Application.Interfaces;
using FjorTerminal.Domain.Entities;
using FjorTerminal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FjorTerminal.Infrastructure.Services
{
    public class PortfolioService : IPortfolioService
    {
        private readonly ApplicationDbContext _context;
        private readonly IBinanceService _binanceService;
        private readonly ILogger<PortfolioService> _logger;

        public PortfolioService(
            ApplicationDbContext context,
            IBinanceService binanceService,
            ILogger<PortfolioService> logger)
        {
            _context = context;
            _binanceService = binanceService;
            _logger = logger;
        }

        public async Task<PortfolioSummaryDto?> GetPortfolioSummaryAsync(Guid userId)
        {
            try
            {
                // Get or create portfolio
                var portfolio = await _context.Portfolios
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (portfolio == null)
                {
                    portfolio = new Portfolio
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Portfolios.Add(portfolio);
                    await _context.SaveChangesAsync();
                }

                // Update portfolio from Binance
                await UpdatePortfolioAsync(userId);
                
                // Reload portfolio
                portfolio = await _context.Portfolios
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (portfolio == null) return null;

                // Calculate trade statistics
                var trades = await _context.Trades
                    .Where(t => t.UserId == userId && t.ExecutedAt != null)
                    .ToListAsync();

                var totalTrades = trades.Count;
                var winningTrades = trades.Count(t => t.RealizedPnl > 0);
                var losingTrades = trades.Count(t => t.RealizedPnl < 0);
                var winRate = totalTrades > 0 ? (decimal)winningTrades / totalTrades * 100 : 0;
                
                var wins = trades.Where(t => t.RealizedPnl > 0).ToList();
                var losses = trades.Where(t => t.RealizedPnl < 0).ToList();
                
                var averageWin = wins.Any() ? wins.Average(t => t.RealizedPnl ?? 0) : 0;
                var averageLoss = losses.Any() ? Math.Abs(losses.Average(t => t.RealizedPnl ?? 0)) : 0;
                
                var totalWins = wins.Sum(t => t.RealizedPnl ?? 0);
                var totalLosses = Math.Abs(losses.Sum(t => t.RealizedPnl ?? 0));
                var profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

                return new PortfolioSummaryDto
                {
                    TotalBalance = portfolio.TotalBalance,
                    AvailableBalance = portfolio.AvailableBalance,
                    InPositions = portfolio.InPositions,
                    TotalPnl = portfolio.TotalPnl,
                    TotalPnlPercentage = portfolio.TotalBalance > 0 
                        ? (portfolio.TotalPnl / portfolio.TotalBalance) * 100 
                        : 0,
                    DailyPnl = portfolio.DailyPnl,
                    DailyPnlPercentage = portfolio.TotalBalance > 0 
                        ? (portfolio.DailyPnl / portfolio.TotalBalance) * 100 
                        : 0,
                    WeeklyPnl = CalculatePnlForPeriod(trades, 7),
                    WeeklyPnlPercentage = portfolio.TotalBalance > 0 
                        ? (CalculatePnlForPeriod(trades, 7) / portfolio.TotalBalance) * 100 
                        : 0,
                    MonthlyPnl = portfolio.MonthlyPnl,
                    MonthlyPnlPercentage = portfolio.TotalBalance > 0 
                        ? (portfolio.MonthlyPnl / portfolio.TotalBalance) * 100 
                        : 0,
                    TotalTrades = totalTrades,
                    WinningTrades = winningTrades,
                    LosingTrades = losingTrades,
                    WinRate = winRate,
                    AverageWin = averageWin,
                    AverageLoss = averageLoss,
                    ProfitFactor = profitFactor,
                    UpdatedAt = portfolio.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting portfolio summary");
                return null;
            }
        }

        public async Task<PaginatedTradeHistoryDto> GetTradeHistoryAsync(Guid userId, TradeHistoryFilterDto filter)
        {
            try
            {
                var query = _context.Trades.Where(t => t.UserId == userId);

                // Apply filters
                if (!string.IsNullOrEmpty(filter.Symbol))
                    query = query.Where(t => t.Symbol == filter.Symbol);

                if (!string.IsNullOrEmpty(filter.Side))
                    query = query.Where(t => t.Side == filter.Side);

                if (!string.IsNullOrEmpty(filter.Type))
                    query = query.Where(t => t.Type == filter.Type);

                if (filter.StartDate.HasValue)
                    query = query.Where(t => t.CreatedAt >= filter.StartDate.Value);

                if (filter.EndDate.HasValue)
                    query = query.Where(t => t.CreatedAt <= filter.EndDate.Value);

                // Get total count
                var totalCount = await query.CountAsync();

                // Calculate total pages
                var totalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize);

                // Apply pagination
                var trades = await query
                    .OrderByDescending(t => t.CreatedAt)
                    .Skip((filter.Page - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(t => new TradeHistoryDto
                    {
                        Id = t.Id,
                        Symbol = t.Symbol,
                        Side = t.Side,
                        Type = t.Type,
                        Quantity = t.Quantity,
                        Price = t.Price,
                        Leverage = t.Leverage,
                        OrderId = t.OrderId,
                        Status = t.Status,
                        Commission = t.Commission,
                        RealizedPnl = t.RealizedPnl,
                        CreatedAt = t.CreatedAt,
                        ExecutedAt = t.ExecutedAt
                    })
                    .ToListAsync();

                return new PaginatedTradeHistoryDto
                {
                    Trades = trades,
                    TotalCount = totalCount,
                    Page = filter.Page,
                    PageSize = filter.PageSize,
                    TotalPages = totalPages
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting trade history");
                return new PaginatedTradeHistoryDto();
            }
        }

        public async Task<PerformanceMetricsDto> GetPerformanceMetricsAsync(Guid userId, int days = 30)
        {
            try
            {
                var startDate = DateTime.UtcNow.AddDays(-days);
                var dailyPnls = await GetDailyPnlAsync(userId, days);

                var totalReturn = dailyPnls.Sum(d => d.Pnl);
                var portfolio = await _context.Portfolios.FirstOrDefaultAsync(p => p.UserId == userId);
                var totalBalance = portfolio?.TotalBalance ?? 0;
                
                var totalReturnPercentage = totalBalance > 0 
                    ? (totalReturn / totalBalance) * 100 
                    : 0;

                // Calculate max drawdown
                var maxDrawdown = 0m;
                var maxDrawdownPercentage = 0m;
                var peak = 0m;
                var runningTotal = 0m;

                foreach (var daily in dailyPnls.OrderBy(d => d.Date))
                {
                    runningTotal += daily.Pnl;
                    if (runningTotal > peak)
                        peak = runningTotal;
                    
                    var drawdown = peak - runningTotal;
                    if (drawdown > maxDrawdown)
                    {
                        maxDrawdown = drawdown;
                        maxDrawdownPercentage = peak > 0 ? (drawdown / peak) * 100 : 0;
                    }
                }

                // Calculate Sharpe Ratio (simplified)
                var avgDailyReturn = dailyPnls.Any() ? dailyPnls.Average(d => d.Pnl) : 0;
                var stdDev = CalculateStandardDeviation(dailyPnls.Select(d => d.Pnl).ToList());
                var sharpeRatio = stdDev > 0 ? (avgDailyReturn / (decimal)stdDev) * (decimal)Math.Sqrt(365) : 0;

                var bestDay = dailyPnls.Any() ? dailyPnls.Max(d => d.Pnl) : 0;
                var worstDay = dailyPnls.Any() ? dailyPnls.Min(d => d.Pnl) : 0;
                var profitableDays = dailyPnls.Count(d => d.Pnl > 0);
                var unprofitableDays = dailyPnls.Count(d => d.Pnl < 0);

                return new PerformanceMetricsDto
                {
                    TotalReturn = totalReturn,
                    TotalReturnPercentage = totalReturnPercentage,
                    MaxDrawdown = maxDrawdown,
                    MaxDrawdownPercentage = maxDrawdownPercentage,
                    SharpeRatio = (decimal)sharpeRatio,
                    AverageDailyReturn = avgDailyReturn,
                    BestDay = bestDay,
                    WorstDay = worstDay,
                    TotalTradingDays = dailyPnls.Count,
                    ProfitableDays = profitableDays,
                    UnprofitableDays = unprofitableDays,
                    DailyPnls = dailyPnls
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting performance metrics");
                return new PerformanceMetricsDto();
            }
        }

        public async Task<List<DailyPnlDto>> GetDailyPnlAsync(Guid userId, int days = 30)
        {
            try
            {
                var startDate = DateTime.UtcNow.AddDays(-days).Date;
                
                var trades = await _context.Trades
                    .Where(t => t.UserId == userId && 
                               t.ExecutedAt.HasValue && 
                               t.ExecutedAt.Value >= startDate)
                    .ToListAsync();

                var dailyGroups = trades
                    .GroupBy(t => t.ExecutedAt!.Value.Date)
                    .Select(g => new DailyPnlDto
                    {
                        Date = g.Key,
                        Pnl = g.Sum(t => t.RealizedPnl ?? 0),
                        PnlPercentage = 0, // Will calculate below
                        TradeCount = g.Count(),
                        WinCount = g.Count(t => t.RealizedPnl > 0),
                        LossCount = g.Count(t => t.RealizedPnl < 0)
                    })
                    .OrderBy(d => d.Date)
                    .ToList();

                // Calculate PnL percentage based on balance at that time
                var portfolio = await _context.Portfolios.FirstOrDefaultAsync(p => p.UserId == userId);
                var currentBalance = portfolio?.TotalBalance ?? 0;

                foreach (var daily in dailyGroups)
                {
                    if (currentBalance > 0)
                        daily.PnlPercentage = (daily.Pnl / currentBalance) * 100;
                }

                return dailyGroups;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting daily PnL");
                return new List<DailyPnlDto>();
            }
        }

        public async Task UpdatePortfolioAsync(Guid userId)
        {
            try
            {
                // Get account info from Binance
                var accountInfo = await _binanceService.GetAccountInfoAsync(userId);
                
                if (accountInfo == null || accountInfo.Assets == null || !accountInfo.Assets.Any())
                    return;

                var usdtBalance = accountInfo.Assets.FirstOrDefault(b => b.Asset == "USDT");
                
                if (usdtBalance == null)
                    return;

                var portfolio = await _context.Portfolios
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (portfolio == null)
                {
                    portfolio = new Portfolio
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId
                    };
                    _context.Portfolios.Add(portfolio);
                }

                // Update balance
                portfolio.TotalBalance = usdtBalance.WalletBalance;
                portfolio.AvailableBalance = usdtBalance.AvailableBalance;
                portfolio.InPositions = usdtBalance.MarginBalance - usdtBalance.AvailableBalance;

                // Calculate PnL
                var today = DateTime.UtcNow.Date;
                var thisMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

                var todayTrades = await _context.Trades
                    .Where(t => t.UserId == userId && 
                               t.ExecutedAt.HasValue && 
                               t.ExecutedAt.Value.Date == today)
                    .ToListAsync();

                var monthTrades = await _context.Trades
                    .Where(t => t.UserId == userId && 
                               t.ExecutedAt.HasValue && 
                               t.ExecutedAt.Value >= thisMonth)
                    .ToListAsync();

                var allTrades = await _context.Trades
                    .Where(t => t.UserId == userId && t.ExecutedAt.HasValue)
                    .ToListAsync();

                portfolio.DailyPnl = todayTrades.Sum(t => t.RealizedPnl ?? 0);
                portfolio.MonthlyPnl = monthTrades.Sum(t => t.RealizedPnl ?? 0);
                portfolio.TotalPnl = allTrades.Sum(t => t.RealizedPnl ?? 0);
                portfolio.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating portfolio");
            }
        }

        // Helper methods

        private decimal CalculatePnlForPeriod(List<Trade> trades, int days)
        {
            var startDate = DateTime.UtcNow.AddDays(-days);
            return trades
                .Where(t => t.ExecutedAt.HasValue && t.ExecutedAt.Value >= startDate)
                .Sum(t => t.RealizedPnl ?? 0);
        }

        private double CalculateStandardDeviation(List<decimal> values)
        {
            if (!values.Any()) return 0;

            var avg = values.Average();
            var sumOfSquares = values.Sum(v => Math.Pow((double)(v - avg), 2));
            return Math.Sqrt(sumOfSquares / values.Count);
        }
    }
}

