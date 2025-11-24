using Microsoft.AspNetCore.Mvc;

namespace FjorTerminal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LogsController : ControllerBase
    {
        private readonly ILogger<LogsController> _logger;

        public LogsController(ILogger<LogsController> logger)
        {
            _logger = logger;
        }

        [HttpPost]
        public IActionResult LogClientError([FromBody] ClientLogDto logDto)
        {
            try
            {
                // Log based on severity
                switch (logDto.Level?.ToLower())
                {
                    case "critical":
                        _logger.LogCritical(
                            "🚨 CLIENT CRITICAL ERROR - Session: {SessionId}, Message: {Message}, Data: {@Data}, UserAgent: {UserAgent}, URL: {Url}",
                            logDto.SessionId,
                            logDto.Message,
                            logDto.Data,
                            logDto.UserAgent,
                            logDto.Url
                        );
                        break;
                    
                    case "error":
                        _logger.LogError(
                            "❌ CLIENT ERROR - Session: {SessionId}, Message: {Message}, Data: {@Data}, UserAgent: {UserAgent}, URL: {Url}",
                            logDto.SessionId,
                            logDto.Message,
                            logDto.Data,
                            logDto.UserAgent,
                            logDto.Url
                        );
                        break;
                    
                    default:
                        _logger.LogWarning(
                            "⚠️ CLIENT LOG - Session: {SessionId}, Message: {Message}, Data: {@Data}",
                            logDto.SessionId,
                            logDto.Message,
                            logDto.Data
                        );
                        break;
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing client log");
                return StatusCode(500, new { success = false, error = "Failed to log error" });
            }
        }
    }

    public class ClientLogDto
    {
        public string Level { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public object? Data { get; set; }
        public string SessionId { get; set; } = string.Empty;
        public string Timestamp { get; set; } = string.Empty;
        public string UserAgent { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
    }
}



