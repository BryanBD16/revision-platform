using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Tests.Infrastructure;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class RoleServiceTests(ApiFactory factory) : IAsyncLifetime
{
    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Grant_GivesTheRoleAndRecordsIt()
    {
        await factory.CreateApiClient().RegisterAdminAsync(factory, "admin@example.com");
        await factory.CreateApiClient().RegisterAsync("ada@example.com");

        var error = await WithServiceAsync((roles, users) =>
            roles.GrantAsync(users["ada@example.com"], RoleNames.Admin, users["admin@example.com"], "admin page"));

        Assert.Null(error);
        Assert.Contains(RoleNames.Admin, await RolesOfAsync("ada@example.com"));
        var change = Assert.Single(await RoleChangesAsync());
        Assert.Equal((RoleNames.Admin, RoleChange.Granted, "admin page"), (change.RoleName, change.Action, change.Origin));
        Assert.Equal("ada@example.com", change.User!.Email);
        Assert.Equal("admin@example.com", change.ChangedBy!.Email);
    }

    [Fact]
    public async Task Grant_RecordsNothingWhenTheUserAlreadyHasTheRole()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com");
        await GrantAsync("ada@example.com", RoleNames.Admin);

        Assert.Null(await GrantAsync("ada@example.com", RoleNames.Admin));

        Assert.Single(await RoleChangesAsync());
    }

    [Fact]
    public async Task Grant_RejectsAnUnknownRole()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com");

        var error = await GrantAsync("ada@example.com", "wizard");

        Assert.Equal("The role 'wizard' does not exist.", error?.Message);
        Assert.Empty(await RoleChangesAsync());
    }

    [Fact]
    public async Task Revoke_RemovesTheRoleAndRecordsIt()
    {
        await factory.CreateApiClient().RegisterAdminAsync(factory, "admin@example.com");
        await factory.CreateApiClient().RegisterAdminAsync(factory, "ada@example.com");

        var error = await WithServiceAsync((roles, users) =>
            roles.RevokeAsync(users["ada@example.com"], RoleNames.Admin, null, "command line"));

        Assert.Null(error);
        Assert.Empty(await RolesOfAsync("ada@example.com"));
        var change = Assert.Single(await RoleChangesAsync());
        Assert.Equal((RoleChange.Revoked, "command line"), (change.Action, change.Origin));
        Assert.Null(change.ChangedByUserId);
    }

    [Fact]
    public async Task Revoke_KeepsTheLastAdmin()
    {
        await factory.CreateApiClient().RegisterAdminAsync(factory, "admin@example.com");

        var error = await WithServiceAsync((roles, users) =>
            roles.RevokeAsync(users["admin@example.com"], RoleNames.Admin, null, "command line"));

        Assert.Equal("The last admin cannot lose the admin role.", error?.Message);
        Assert.Contains(RoleNames.Admin, await RolesOfAsync("admin@example.com"));
    }

    [Fact]
    public async Task Revoke_DoesNotLetAnAdminRemoveTheirOwnAdminRole()
    {
        await factory.CreateApiClient().RegisterAdminAsync(factory, "admin@example.com");
        await factory.CreateApiClient().RegisterAdminAsync(factory, "ada@example.com");

        var error = await WithServiceAsync((roles, users) =>
            roles.RevokeAsync(users["ada@example.com"], RoleNames.Admin, users["ada@example.com"], "admin page"));

        Assert.Equal("You cannot remove your own admin role. Ask another admin.", error?.Message);
        Assert.Empty(await RoleChangesAsync());
    }

    [Fact]
    public async Task RoleChanges_ApplyToExistingSessionsImmediately()
    {
        var client = factory.CreateApiClient();
        await client.RegisterAsync("ada@example.com");
        Assert.Empty((await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me"))!.Permissions);

        await GrantAsync("ada@example.com", RoleNames.Admin);

        var me = await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");
        Assert.Equal([RoleNames.Admin], me!.Roles);
        Assert.Equal([Policies.PublishActivities, Policies.ManageRoles], me.Permissions);
    }

    private Task<RoleChangeError?> GrantAsync(string email, string role) =>
        WithServiceAsync((roles, users) => roles.GrantAsync(users[email], role, null, "test"));

    /// <summary>Runs <paramref name="action"/> with a RoleService and the users by email.</summary>
    private async Task<T> WithServiceAsync<T>(Func<RoleService, Dictionary<string, AppUser>, Task<T>> action)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var users = await db.Users.ToDictionaryAsync(u => u.Email!);
        return await action(scope.ServiceProvider.GetRequiredService<RoleService>(), users);
    }

    private async Task<IList<string>> RolesOfAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        return await users.GetRolesAsync((await users.FindByEmailAsync(email))!);
    }

    private async Task<List<RoleChange>> RoleChangesAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.RoleChanges.Include(c => c.User).Include(c => c.ChangedBy).ToListAsync();
    }
}
