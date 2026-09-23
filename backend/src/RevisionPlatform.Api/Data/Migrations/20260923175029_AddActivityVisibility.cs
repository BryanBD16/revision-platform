using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RevisionPlatform.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityVisibility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "owner_id",
                table: "revision_activities",
                type: "int",
                nullable: true);

            // The activities created before users existed, including the seed activities,
            // become public activities without an owner.
            migrationBuilder.AddColumn<string>(
                name: "visibility",
                table: "revision_activities",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "public")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_revision_activities_owner_id",
                table: "revision_activities",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "ix_revision_activities_visibility",
                table: "revision_activities",
                column: "visibility");

            migrationBuilder.AddCheckConstraint(
                name: "ck_revision_activities_visibility_owner",
                table: "revision_activities",
                sql: "(visibility = 'public' AND owner_id IS NULL) OR (visibility = 'private' AND owner_id IS NOT NULL)");

            migrationBuilder.AddForeignKey(
                name: "fk_revision_activities_users_owner_id",
                table: "revision_activities",
                column: "owner_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_revision_activities_users_owner_id",
                table: "revision_activities");

            migrationBuilder.DropIndex(
                name: "ix_revision_activities_owner_id",
                table: "revision_activities");

            migrationBuilder.DropIndex(
                name: "ix_revision_activities_visibility",
                table: "revision_activities");

            migrationBuilder.DropCheckConstraint(
                name: "ck_revision_activities_visibility_owner",
                table: "revision_activities");

            migrationBuilder.DropColumn(
                name: "owner_id",
                table: "revision_activities");

            migrationBuilder.DropColumn(
                name: "visibility",
                table: "revision_activities");
        }
    }
}
