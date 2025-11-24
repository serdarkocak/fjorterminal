using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace FjorTerminal.API.Hubs
{
    [Authorize]
    public class TradingHub : Hub
    {
        private readonly ILogger<TradingHub> _logger;
        private static readonly Dictionary<string, string> _userConnections = new();

        public TradingHub(ILogger<TradingHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            
            if (!string.IsNullOrEmpty(userId))
            {
                _userConnections[userId] = Context.ConnectionId;
                _logger.LogInformation("User {UserId} connected with connection {ConnectionId}", userId, Context.ConnectionId);
                
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
                await Clients.Caller.SendAsync("Connected", new { userId, connectionId = Context.ConnectionId });
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            
            if (!string.IsNullOrEmpty(userId) && _userConnections.ContainsKey(userId))
            {
                _userConnections.Remove(userId);
                _logger.LogInformation("User {UserId} disconnected", userId);
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task SubscribeToSymbol(string symbol)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"symbol_{symbol}");
            _logger.LogInformation("User subscribed to symbol {Symbol}", symbol);
        }

        public async Task UnsubscribeFromSymbol(string symbol)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"symbol_{symbol}");
            _logger.LogInformation("User unsubscribed from symbol {Symbol}", symbol);
        }

        public async Task SendMessage(string message)
        {
            var userId = GetUserId();
            await Clients.All.SendAsync("ReceiveMessage", userId, message);
        }

        // Send position update to specific user
        public static async Task SendPositionUpdate(IHubContext<TradingHub> hubContext, string userId, object positionData)
        {
            await hubContext.Clients.Group($"user_{userId}").SendAsync("PositionUpdate", positionData);
        }

        // Send balance update to specific user
        public static async Task SendBalanceUpdate(IHubContext<TradingHub> hubContext, string userId, object balanceData)
        {
            await hubContext.Clients.Group($"user_{userId}").SendAsync("BalanceUpdate", balanceData);
        }

        // Send order update to specific user
        public static async Task SendOrderUpdate(IHubContext<TradingHub> hubContext, string userId, object orderData)
        {
            await hubContext.Clients.Group($"user_{userId}").SendAsync("OrderUpdate", orderData);
        }

        // Send notification to specific user
        public static async Task SendNotification(IHubContext<TradingHub> hubContext, string userId, object notification)
        {
            await hubContext.Clients.Group($"user_{userId}").SendAsync("Notification", notification);
        }

        private string GetUserId()
        {
            return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                ?? Context.User?.FindFirst("sub")?.Value 
                ?? string.Empty;
        }

        public static string? GetConnectionId(string userId)
        {
            return _userConnections.TryGetValue(userId, out var connectionId) ? connectionId : null;
        }
    }
}

