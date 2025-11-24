using FjorTerminal.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FjorTerminal.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // DbSets
        public DbSet<User> Users { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<ExchangeConnection> ExchangeConnections { get; set; }
        public DbSet<UserSettings> UserSettings { get; set; }
        public DbSet<Trade> Trades { get; set; }
        public DbSet<Position> Positions { get; set; }
        public DbSet<Portfolio> Portfolios { get; set; }
        public DbSet<TradingBot> TradingBots { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User Configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PasswordHash).IsRequired();
                entity.Property(e => e.FirstName).HasMaxLength(100);
                entity.Property(e => e.LastName).HasMaxLength(100);
                entity.Property(e => e.PhoneNumber).HasMaxLength(20);
                
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.Username).IsUnique();

                entity.HasMany(e => e.UserRoles)
                      .WithOne(e => e.User)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.RefreshTokens)
                      .WithOne(e => e.User)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.ExchangeConnections)
                      .WithOne(e => e.User)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.Trades)
                      .WithOne(e => e.User)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(e => e.Positions)
                      .WithOne(e => e.User)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Portfolio)
                      .WithOne(e => e.User)
                      .HasForeignKey<Portfolio>(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.TradingBots)
                      .WithOne(e => e.User)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.Notifications)
                      .WithOne(e => e.User)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.AuditLogs)
                      .WithOne(e => e.User)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // UserSettings Configuration
            modelBuilder.Entity<UserSettings>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UserId).IsRequired();
                
                entity.HasIndex(e => e.UserId).IsUnique();
                
                entity.HasOne(e => e.User)
                      .WithOne()
                      .HasForeignKey<UserSettings>(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // UserRole Configuration
            modelBuilder.Entity<UserRole>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
            });

            // RefreshToken Configuration
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Token).IsRequired();
                entity.Ignore(e => e.IsExpired);
                entity.Ignore(e => e.IsActive);
            });

            // ExchangeConnection Configuration
            modelBuilder.Entity<ExchangeConnection>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ExchangeName).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ApiKey).IsRequired();
                entity.Property(e => e.ApiSecret).IsRequired();
            });

            // Trade Configuration
            modelBuilder.Entity<Trade>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Symbol).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Side).IsRequired().HasMaxLength(10);
                entity.Property(e => e.Type).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Quantity).HasPrecision(18, 8);
                entity.Property(e => e.Price).HasPrecision(18, 8);
                entity.Property(e => e.Commission).HasPrecision(18, 8);
                entity.Property(e => e.RealizedPnl).HasPrecision(18, 8);
                entity.Property(e => e.Status).HasMaxLength(20);
                entity.Property(e => e.OrderId).HasMaxLength(50);
            });

            // Position Configuration
            modelBuilder.Entity<Position>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Symbol).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Side).IsRequired().HasMaxLength(10);
                entity.Property(e => e.EntryPrice).HasPrecision(18, 8);
                entity.Property(e => e.CurrentPrice).HasPrecision(18, 8);
                entity.Property(e => e.Quantity).HasPrecision(18, 8);
                entity.Property(e => e.Margin).HasPrecision(18, 8);
                entity.Property(e => e.UnrealizedPnl).HasPrecision(18, 8);
                entity.Property(e => e.RealizedPnl).HasPrecision(18, 8);
                entity.Property(e => e.StopLoss).HasPrecision(18, 8);
                entity.Property(e => e.TakeProfit).HasPrecision(18, 8);
            });

            // Portfolio Configuration
            modelBuilder.Entity<Portfolio>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TotalBalance).HasPrecision(18, 8);
                entity.Property(e => e.AvailableBalance).HasPrecision(18, 8);
                entity.Property(e => e.InPositions).HasPrecision(18, 8);
                entity.Property(e => e.TotalPnl).HasPrecision(18, 8);
                entity.Property(e => e.DailyPnl).HasPrecision(18, 8);
                entity.Property(e => e.MonthlyPnl).HasPrecision(18, 8);
            });

            // TradingBot Configuration
            modelBuilder.Entity<TradingBot>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.BotType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Symbol).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Configuration).IsRequired();
                entity.Property(e => e.TotalPnl).HasPrecision(18, 8);
            });

            // Notification Configuration
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Message).IsRequired();
            });

            // AuditLog Configuration
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
                entity.Property(e => e.EntityType).HasMaxLength(100);
                entity.Property(e => e.EntityId).HasMaxLength(100);
                entity.Property(e => e.IpAddress).HasMaxLength(50);
            });
        }
    }
}

