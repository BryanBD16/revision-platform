using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RevisionPlatform.Api.Data;

namespace RevisionPlatform.Api.Tests.Infrastructure;

/// <summary>
/// Runs the API in memory against the MySQL test database.
/// The database is recreated from the migrations once per test run.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string ConnectionVariable = "TEST_DATABASE_CONNECTION";

    private readonly string _connectionString =
        Environment.GetEnvironmentVariable(ConnectionVariable)
        ?? throw new InvalidOperationException(
            $"{ConnectionVariable} is not set. Run the tests with 'make backend-test' (it reads .env).");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", _connectionString);
    }

    public async Task InitializeAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.MigrateAsync();
    }

    /// <summary>Removes all rows so each test starts from an empty database.</summary>
    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.RevisionActivities.ExecuteDeleteAsync();
        await db.Themes.ExecuteDeleteAsync();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;
}

[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    // Tests in this collection share one API instance and database, so they run sequentially.
    public const string Name = "Api";
}
