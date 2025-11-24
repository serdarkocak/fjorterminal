using System;

namespace FjorTerminal.Domain.Entities
{
    public class UserRole
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Role { get; set; } = string.Empty; // Admin, User, Premium, etc.
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public User User { get; set; } = null!;
    }
}

