using FjorTerminal.Application.DTOs.Binance;

namespace FjorTerminal.Application.Interfaces
{
    public interface IBinanceService
    {
        Task<bool> ValidateCredentialsAsync(string apiKey, string apiSecret);
        Task<AccountInfoDto?> GetAccountInfoAsync(Guid userId);
        Task<decimal> GetSymbolPriceAsync(string symbol);
        Task<Dictionary<string, decimal>> GetMultiplePricesAsync(List<string> symbols);
        Task<PlaceOrderResponseDto?> PlaceFuturesOrderAsync(Guid userId, PlaceOrderRequestDto request);
        Task<SetLeverageResponseDto?> SetLeverageAsync(Guid userId, SetLeverageRequestDto request);
    }
}

