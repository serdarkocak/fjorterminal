namespace FjorTerminal.Application.DTOs.Binance
{
    public class AccountBalanceDto
    {
        public string Asset { get; set; } = string.Empty;
        public decimal WalletBalance { get; set; }
        public decimal UnrealizedProfit { get; set; }
        public decimal MarginBalance { get; set; }
        public decimal AvailableBalance { get; set; }
        public decimal MaxWithdrawAmount { get; set; }
    }

    public class AccountInfoDto
    {
        public int FeeTier { get; set; }
        public bool CanTrade { get; set; }
        public bool CanDeposit { get; set; }
        public bool CanWithdraw { get; set; }
        public DateTime UpdateTime { get; set; }
        public decimal TotalInitialMargin { get; set; }
        public decimal TotalMaintMargin { get; set; }
        public decimal TotalWalletBalance { get; set; }
        public decimal TotalUnrealizedProfit { get; set; }
        public decimal TotalMarginBalance { get; set; }
        public decimal TotalPositionInitialMargin { get; set; }
        public decimal TotalOpenOrderInitialMargin { get; set; }
        public decimal TotalCrossWalletBalance { get; set; }
        public decimal TotalCrossUnPnl { get; set; }
        public decimal AvailableBalance { get; set; }
        public decimal MaxWithdrawAmount { get; set; }
        public List<AccountBalanceDto> Assets { get; set; } = new();
    }
}

