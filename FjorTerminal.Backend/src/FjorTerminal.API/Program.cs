using FjorTerminal.API.Hubs;
using FjorTerminal.API.Services;
using FjorTerminal.Application.Interfaces;
using FjorTerminal.Infrastructure.Data;
using FjorTerminal.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null
        )
    ));

// Add Redis
var redisConnection = builder.Configuration.GetValue<string>("Redis:ConnectionString") ?? "172.18.94.222:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    try
    {
        var logger = sp.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("🔗 Connecting to Redis: {RedisConnection}", redisConnection);
        
        var config = ConfigurationOptions.Parse(redisConnection);
        config.AbortOnConnectFail = false; // Don't crash if Redis is unavailable
        config.ConnectTimeout = 10000; // 10 seconds
        config.SyncTimeout = 10000; // 10 seconds
        config.AsyncTimeout = 10000; // 10 seconds
        config.ConnectRetry = 3; // Retry 3 times
        config.KeepAlive = 60; // Keep connection alive
        
        var multiplexer = ConnectionMultiplexer.Connect(config);
        
        if (multiplexer.IsConnected)
        {
            logger.LogInformation("✅ Redis connected successfully: {RedisConnection}", redisConnection);
        }
        else
        {
            logger.LogWarning("⚠️ Redis connection established but not connected yet");
        }
        
        return multiplexer;
    }
    catch (Exception ex)
    {
        var logger = sp.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "❌ Could not connect to Redis: {RedisConnection}. Running without cache.", redisConnection);
        
        // Return a placeholder that won't crash the app
        var config = ConfigurationOptions.Parse(redisConnection);
        config.AbortOnConnectFail = false;
        return ConnectionMultiplexer.Connect(config);
    }
});

// Add Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IBinanceService, BinanceService>();
builder.Services.AddScoped<ITradingService, TradingService>();
builder.Services.AddScoped<IPortfolioService, PortfolioService>();
builder.Services.AddSingleton<ICacheService, RedisCacheService>();

// Add Background Services
builder.Services.AddHostedService<PriceUpdateService>();

// Add HttpClient for Binance
builder.Services.AddHttpClient("BinanceClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "FjorTerminal");
})
.SetHandlerLifetime(TimeSpan.FromMinutes(5));

// Add HttpClient for News (RSS feeds)
builder.Services.AddHttpClient("NewsClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
    client.DefaultRequestHeaders.Add("User-Agent", "FjorTerminal");
})
.SetHandlerLifetime(TimeSpan.FromMinutes(5));

// Add JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})  
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
    
    // Allow SignalR to use JWT tokens
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Add Controllers with JSON options for decimal serialization
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Use camelCase for JSON property names (to match JavaScript conventions)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Use default number handling for decimals but ensure proper formatting
        options.JsonSerializerOptions.NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// Add SignalR
builder.Services.AddSignalR();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:5173" })
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Add Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "FjorTerminal API", Version = "v1" });
    
    // Add JWT Authentication to Swagger
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

// Auto-migrate database on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("🔄 Applying database migrations...");
        var context = services.GetRequiredService<ApplicationDbContext>();
        context.Database.Migrate(); // Applies pending migrations
        logger.LogInformation("✅ Database migrations applied successfully");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ An error occurred while applying database migrations");
        // Don't throw - let app start and retry on next request
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map SignalR Hubs
app.MapHub<TradingHub>("/hubs/trading");

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
   .WithName("HealthCheck");

app.Run();
