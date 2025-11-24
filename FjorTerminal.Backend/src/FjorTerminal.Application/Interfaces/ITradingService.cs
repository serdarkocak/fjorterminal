using FjorTerminal.Application.DTOs.Trading;

namespace FjorTerminal.Application.Interfaces
{
    public interface ITradingService
    {
        Task<OrderResponseDto?> PlaceMarketOrderAsync(Guid userId, MarketOrderDto dto);
        Task<OrderResponseDto?> PlaceLimitOrderAsync(Guid userId, LimitOrderDto dto);
        Task<OrderResponseDto?> PlaceStopLossOrderAsync(Guid userId, StopLossOrderDto dto);
        Task<OrderResponseDto?> PlaceTakeProfitOrderAsync(Guid userId, TakeProfitOrderDto dto);
        Task<bool> CancelOrderAsync(Guid userId, string symbol, string orderId);
        Task<List<OrderResponseDto>> GetOpenOrdersAsync(Guid userId, string? symbol = null);
        Task<List<PositionDto>> GetPositionsAsync(Guid userId);
        Task<bool> ClosePositionAsync(Guid userId, ClosePositionDto dto);
        Task<bool> SetLeverageAsync(Guid userId, SetLeverageDto dto);
    }
}

