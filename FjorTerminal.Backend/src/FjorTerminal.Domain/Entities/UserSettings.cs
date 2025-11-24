namespace FjorTerminal.Domain.Entities;

public class UserSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    
    // JSON string to store ticker shortcuts
    // Example: [{"baseAsset":"BTC","priceDecimals":2},{"baseAsset":"ETH","priceDecimals":2}]
    public string? TickerShortcuts { get; set; }
    
    // JSON string to store position settings
    // Example: {"BTC":{"sizePresets":["50","100","1000"],"defaultLeverage":10}}
    public string? PositionSettings { get; set; }
    
    // JSON string to store leverage settings
    // Example: {"BTC":10,"ETH":5}
    public string? LeverageSettings { get; set; }
    
    // JSON string to store crypto detected coins
    // Example: ["BTC","ETH","SOL"]
    public string? CryptoDetectedCoins { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public User User { get; set; } = null!;
}

