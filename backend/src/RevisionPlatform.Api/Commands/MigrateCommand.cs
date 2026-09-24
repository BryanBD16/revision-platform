using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Data;

namespace RevisionPlatform.Api.Commands;

/// <summary>
/// Applies the pending EF Core migrations, run with <c>dotnet run -- migrate</c>.
/// Used where the <c>dotnet ef</c> tool is not available, such as the production container.
/// </summary>
public static class MigrateCommand
{
    public const string Name = "migrate";

    public static async Task<int> RunAsync(IServiceProvider services, string[] args, TextWriter output)
    {
        if (args.Length != 0)
        {
            output.WriteLine("Usage: migrate");
            return 1;
        }

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        await db.Database.MigrateAsync();

        output.WriteLine(pending.Count == 0
            ? "The database is up to date."
            : $"Applied {pending.Count} migration(s): {string.Join(", ", pending)}.");
        return 0;
    }
}
