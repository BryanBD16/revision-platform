using Microsoft.AspNetCore.Hosting;
using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
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
        // The tests send many requests from the same address; RateLimitingTests uses a low limit.
        builder.UseSetting("RateLimiting:PasswordRequestsPerMinute", "100000");
    }

    /// <summary>
    /// Creates a client that behaves like the frontend in a browser: it keeps the cookies
    /// (the session) and sends the anti-forgery token. Each client is a separate visitor.
    /// </summary>
    public HttpClient CreateApiClient() => CreateApiClient(this);

    public static HttpClient CreateApiClient<T>(WebApplicationFactory<T> factory) where T : class
    {
        var cookies = new CookieContainer();
        return factory.CreateDefaultClient(new XsrfHandler(cookies), new CookieContainerHandler(cookies));
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
        await db.RoleChanges.ExecuteDeleteAsync();
        // Deleting a user also deletes its roles, claims, logins and tokens (cascade).
        await db.Users.ExecuteDeleteAsync();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;
}

[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    // Tests in this collection share one API instance and database, so they run sequentially.
    public const string Name = "Api";
}
