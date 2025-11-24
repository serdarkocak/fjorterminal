using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FjorTerminal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRssFeedsFromUserSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RssFeeds",
                table: "UserSettings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RssFeeds",
                table: "UserSettings",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
