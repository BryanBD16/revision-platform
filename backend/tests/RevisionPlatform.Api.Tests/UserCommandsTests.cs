using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Commands;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Tests.Infrastructure;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class UserCommandsTests(ApiFactory factory) : IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task List_ShowsTheUsersAndTheirRoles()
    {
        await factory.CreateApiClient().RegisterAdminAsync(factory, "admin@example.com", "Grace");
        await factory.CreateApiClient().RegisterAsync("ada@example.com", "Ada");

        var (exitCode, output) = await RunAsync("", "list");

        Assert.Equal(0, exitCode);
        Assert.Contains("Ada <ada@example.com>", output);
        Assert.Contains("Grace <admin@example.com>", output);
        Assert.Contains("Roles:   admin", output);
        Assert.Contains("Roles:   none", output);
    }

    [Fact]
    public async Task GrantRole_ShowsTheUserAndGivesTheRoleOnceConfirmed()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com", "Ada");

        var (exitCode, output) = await RunAsync("yes\n", "grant-role", "ada@example.com", "admin");

        Assert.Equal(0, exitCode);
        Assert.Contains("Ada <ada@example.com>", output);
        Assert.Contains("Type 'yes' to confirm", output);
        Assert.Contains(RoleNames.Admin, await RolesOfAsync("ada@example.com"));
        var change = Assert.Single(await RoleChangesAsync());
        Assert.StartsWith("command line (", change.Origin);
        Assert.Null(change.ChangedByUserId);
    }

    [Theory]
    [InlineData("no\n")]
    [InlineData("y\n")]
    [InlineData("")]
    public async Task GrantRole_ChangesNothingWithoutConfirmation(string answer)
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com");

        var (exitCode, output) = await RunAsync(answer, "grant-role", "ada@example.com", "admin");

        Assert.Equal(1, exitCode);
        Assert.Contains("Cancelled.", output);
        Assert.Empty(await RolesOfAsync("ada@example.com"));
        Assert.Empty(await RoleChangesAsync());
    }

    [Fact]
    public async Task GrantRole_SkipsTheConfirmationWithYes()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com");

        var (exitCode, _) = await RunAsync("", "grant-role", "ada@example.com", "admin", "--yes");

        Assert.Equal(0, exitCode);
        Assert.Contains(RoleNames.Admin, await RolesOfAsync("ada@example.com"));
    }

    [Theory]
    [InlineData("grant-role", "nobody@example.com", "admin", "no user has the email")]
    [InlineData("grant-role", "ada@example.com", "wizard", "The role 'wizard' does not exist.")]
    [InlineData("revoke-role", "admin@example.com", "admin", "The last admin cannot lose the admin role.")]
    public async Task RoleCommands_ReportErrors(string command, string email, string role, string error)
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com");
        await factory.CreateApiClient().RegisterAdminAsync(factory, "admin@example.com");

        var (exitCode, output) = await RunAsync("", command, email, role, "--yes");

        Assert.Equal(1, exitCode);
        Assert.Contains(error, output);
    }

    [Fact]
    public async Task RevokeRole_RemovesTheRole()
    {
        await factory.CreateApiClient().RegisterAdminAsync(factory, "admin@example.com");
        await factory.CreateApiClient().RegisterAdminAsync(factory, "ada@example.com");

        var (exitCode, _) = await RunAsync("yes\n", "revoke-role", "ada@example.com", "admin");

        Assert.Equal(0, exitCode);
        Assert.Empty(await RolesOfAsync("ada@example.com"));
    }

    [Fact]
    public async Task ResetPassword_ReplacesThePasswordUnlocksAndSignsOutEverySession()
    {
        var session = factory.CreateApiClient();
        await session.RegisterAsync("ada@example.com");
        var attacker = factory.CreateApiClient();
        for (var attempt = 0; attempt < 5; attempt++)
        {
            await SignInAsync(attacker, "wrong password!");
        }

        var (exitCode, output) = await RunAsync("yes\n", "reset-password", "ada@example.com");

        Assert.Equal(0, exitCode);
        var temporary = Regex.Match(output, "Temporary password: (\\S+)").Groups[1].Value;
        Assert.True(temporary.Length >= AuthServiceCollectionExtensions.PasswordMinLength);
        Assert.Equal(HttpStatusCode.NoContent, (await session.GetAsync("/api/auth/me")).StatusCode);
        var client = factory.CreateApiClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await SignInAsync(client, AuthExtensions.Password)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await SignInAsync(client, temporary)).StatusCode);
    }

    [Fact]
    public async Task UnknownCommand_ShowsTheUsage()
    {
        var (exitCode, output) = await RunAsync("", "delete-everything");

        Assert.Equal(1, exitCode);
        Assert.Contains("Usage: users <command>", output);
    }

    private async Task<(int ExitCode, string Output)> RunAsync(string input, params string[] args)
    {
        var output = new StringWriter();
        var exitCode = await UserCommands.RunAsync(factory.Services, args, new StringReader(input), output);
        return (exitCode, output.ToString());
    }

    private static Task<HttpResponseMessage> SignInAsync(HttpClient client, string password) =>
        client.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest("ada@example.com", password));

    private async Task<List<string>> RolesOfAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.UserRoles
            .Where(ur => db.Users.Any(u => u.Id == ur.UserId && u.Email == email))
            .Join(db.Roles, ur => ur.RoleId, r => r.Id, (_, r) => r.Name!)
            .ToListAsync();
    }

    private async Task<List<RoleChange>> RoleChangesAsync()
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().RoleChanges.ToListAsync();
    }
}
