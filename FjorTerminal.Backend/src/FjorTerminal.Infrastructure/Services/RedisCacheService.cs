using FjorTerminal.Application.Interfaces;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System.Text.Json;

namespace FjorTerminal.Infrastructure.Services
{
    public class RedisCacheService : ICacheService
    {
        private readonly IConnectionMultiplexer _redis;
        private readonly IDatabase _database;
        private readonly ILogger<RedisCacheService> _logger;

        public RedisCacheService(IConnectionMultiplexer redis, ILogger<RedisCacheService> logger)
        {
            _redis = redis;
            _database = redis.GetDatabase();
            _logger = logger;
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            try
            {
                var value = await _database.StringGetAsync(key);
                
                if (!value.HasValue)
                    return default;

                return JsonSerializer.Deserialize<T>(value!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cache key: {Key}", key);
                return default;
            }
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
        {
            try
            {
                // Check if Redis is connected before attempting operation
                if (!_redis.IsConnected)
                {
                    _logger.LogWarning("⚠️ Redis not connected, skipping cache set for key: {Key}", key);
                    return;
                }

                var json = JsonSerializer.Serialize(value);
                
                // Use a short timeout for cache operations to prevent blocking
                var setTask = _database.StringSetAsync(key, json, expiry);
                var completedTask = await Task.WhenAny(setTask, Task.Delay(2000)); // 2 second timeout
                
                if (completedTask != setTask)
                {
                    _logger.LogWarning("⚠️ Cache set timeout for key: {Key}", key);
                    return;
                }
                
                await setTask; // Await the actual result
            }
            catch (Exception ex)
            {
                // Log but don't throw - cache failures shouldn't break the app
                _logger.LogWarning(ex, "⚠️ Non-critical error setting cache key: {Key}", key);
            }
        }

        public async Task<bool> RemoveAsync(string key)
        {
            try
            {
                return await _database.KeyDeleteAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cache key: {Key}", key);
                return false;
            }
        }

        public async Task<bool> ExistsAsync(string key)
        {
            try
            {
                return await _database.KeyExistsAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking cache key existence: {Key}", key);
                return false;
            }
        }

        public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiry = null)
        {
            try
            {
                var value = await GetAsync<T>(key);
                
                if (value != null)
                    return value;

                var newValue = await factory();
                await SetAsync(key, newValue, expiry);
                return newValue;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetOrSet for cache key: {Key}", key);
                return await factory();
            }
        }
    }
}

