using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RevisionPlatform.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddThemeKind : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_themes_name",
                table: "themes");

            // All the themes created before courses existed are topics.
            migrationBuilder.AddColumn<string>(
                name: "kind",
                table: "themes",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "topic")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_themes_kind_name",
                table: "themes",
                columns: new[] { "kind", "name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_themes_kind_name",
                table: "themes");

            migrationBuilder.DropColumn(
                name: "kind",
                table: "themes");

            migrationBuilder.CreateIndex(
                name: "ix_themes_name",
                table: "themes",
                column: "name",
                unique: true);
        }
    }
}
