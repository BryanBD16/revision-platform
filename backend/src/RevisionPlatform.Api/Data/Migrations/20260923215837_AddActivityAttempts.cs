using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RevisionPlatform.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityAttempts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "activity_attempts",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    activity_id = table.Column<int>(type: "int", nullable: true),
                    activity_title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    score = table.Column<int>(type: "int", nullable: true),
                    max_score = table.Column<int>(type: "int", nullable: true),
                    completed_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_activity_attempts", x => x.id);
                    table.ForeignKey(
                        name: "fk_activity_attempts_revision_activities_activity_id",
                        column: x => x.activity_id,
                        principalTable: "revision_activities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_activity_attempts_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "attempt_modules",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    attempt_id = table.Column<int>(type: "int", nullable: false),
                    module_id = table.Column<int>(type: "int", nullable: true),
                    position = table.Column<int>(type: "int", nullable: false),
                    module_type = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    label = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    score = table.Column<int>(type: "int", nullable: true),
                    max_score = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attempt_modules", x => x.id);
                    table.ForeignKey(
                        name: "fk_attempt_modules_activity_attempts_attempt_id",
                        column: x => x.attempt_id,
                        principalTable: "activity_attempts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_attempt_modules_revision_modules_module_id",
                        column: x => x.module_id,
                        principalTable: "revision_modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_activity_attempts_activity_id",
                table: "activity_attempts",
                column: "activity_id");

            migrationBuilder.CreateIndex(
                name: "ix_activity_attempts_user_id_completed_at",
                table: "activity_attempts",
                columns: new[] { "user_id", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_attempt_modules_attempt_id_position",
                table: "attempt_modules",
                columns: new[] { "attempt_id", "position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_attempt_modules_module_id",
                table: "attempt_modules",
                column: "module_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attempt_modules");

            migrationBuilder.DropTable(
                name: "activity_attempts");
        }
    }
}
