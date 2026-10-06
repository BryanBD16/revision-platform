using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RevisionPlatform.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTriviaScores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trivia_scores",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    score = table.Column<int>(type: "int", nullable: false),
                    played_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trivia_scores", x => x.id);
                    table.ForeignKey(
                        name: "fk_trivia_scores_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "trivia_score_themes",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    trivia_score_id = table.Column<int>(type: "int", nullable: false),
                    theme_id = table.Column<int>(type: "int", nullable: true),
                    theme_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trivia_score_themes", x => x.id);
                    table.ForeignKey(
                        name: "fk_trivia_score_themes_themes_theme_id",
                        column: x => x.theme_id,
                        principalTable: "themes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_trivia_score_themes_trivia_scores_trivia_score_id",
                        column: x => x.trivia_score_id,
                        principalTable: "trivia_scores",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_trivia_score_themes_theme_id",
                table: "trivia_score_themes",
                column: "theme_id");

            migrationBuilder.CreateIndex(
                name: "ix_trivia_score_themes_trivia_score_id",
                table: "trivia_score_themes",
                column: "trivia_score_id");

            migrationBuilder.CreateIndex(
                name: "ix_trivia_scores_user_id_played_at",
                table: "trivia_scores",
                columns: new[] { "user_id", "played_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trivia_score_themes");

            migrationBuilder.DropTable(
                name: "trivia_scores");
        }
    }
}
