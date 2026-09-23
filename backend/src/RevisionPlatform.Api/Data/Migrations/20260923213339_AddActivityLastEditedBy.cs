using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RevisionPlatform.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityLastEditedBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "last_edited_by_user_id",
                table: "revision_activities",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_revision_activities_last_edited_by_user_id",
                table: "revision_activities",
                column: "last_edited_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_revision_activities_users_last_edited_by_user_id",
                table: "revision_activities",
                column: "last_edited_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_revision_activities_users_last_edited_by_user_id",
                table: "revision_activities");

            migrationBuilder.DropIndex(
                name: "ix_revision_activities_last_edited_by_user_id",
                table: "revision_activities");

            migrationBuilder.DropColumn(
                name: "last_edited_by_user_id",
                table: "revision_activities");
        }
    }
}
