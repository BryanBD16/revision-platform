using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Admin;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Tests.Infrastructure;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class AdminEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _admin = factory.CreateApiClient();
    private CurrentUserResponse _adminUser = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        _adminUser = await _admin.RegisterAdminAsync(factory, "admin@example.com", "Grace");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Theory]
    [InlineData("GET", "/api/admin/users")]
    [InlineData("GET", "/api/admin/roles")]
    [InlineData("GET", "/api/admin/role-changes")]
    [InlineData("PUT", "/api/admin/users/1/roles/admin")]
    [InlineData("DELETE", "/api/admin/users/1/roles/admin")]
    public async Task Endpoints_AreOnlyForAdmins(string method, string url)
    {
        var visitor = factory.CreateApiClient();
        var user = factory.CreateApiClient();
        await user.RegisterAsync("ada@example.com");

        var visitorResponse = await visitor.SendAsync(new HttpRequestMessage(new HttpMethod(method), url));
        var userResponse = await user.SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        Assert.Equal(HttpStatusCode.Unauthorized, visitorResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, userResponse.StatusCode);
    }

    [Fact]
    public async Task GetUsers_ListsTheUsersWithTheirRolesSortedByEmail()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com", "Ada");

        var page = await _admin.GetFromJsonAsync<AdminUserPageResponse>("/api/admin/users");

        Assert.Equal(2, page!.TotalCount);
        Assert.Equal(["ada@example.com", "admin@example.com"], page.Items.Select(u => u.Email));
        Assert.Equal([[], [RoleNames.Admin]], page.Items.Select(u => u.Roles));
        Assert.All(page.Items, u => Assert.False(u.LockedOut));
    }

    [Fact]
    public async Task GetUsers_SearchesTheEmailAndTheDisplayNameIgnoringCase()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com", "Ada Lovelace");
        await factory.CreateApiClient().RegisterAsync("alan@example.com", "Alan Turing");

        var byName = await _admin.GetFromJsonAsync<AdminUserPageResponse>("/api/admin/users?search=LOVELACE");
        var byEmail = await _admin.GetFromJsonAsync<AdminUserPageResponse>("/api/admin/users?search=alan@");

        Assert.Equal(["ada@example.com"], byName!.Items.Select(u => u.Email));
        Assert.Equal(["alan@example.com"], byEmail!.Items.Select(u => u.Email));
    }

    [Fact]
    public async Task GetUsers_ShowsLockedOutUsers()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com");
        var attacker = factory.CreateApiClient();
        for (var attempt = 0; attempt < 5; attempt++)
        {
            await attacker.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest("ada@example.com", "wrong password!"));
        }

        var page = await _admin.GetFromJsonAsync<AdminUserPageResponse>("/api/admin/users?search=ada@");

        Assert.True(Assert.Single(page!.Items).LockedOut);
    }

    [Fact]
    public async Task GetUsers_Paginates()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com");
        await factory.CreateApiClient().RegisterAsync("bob@example.com");

        var page = await _admin.GetFromJsonAsync<AdminUserPageResponse>("/api/admin/users?page=2&pageSize=2");

        Assert.Equal(["bob@example.com"], page!.Items.Select(u => u.Email));
        Assert.Equal(3, page.TotalCount);
    }

    [Fact]
    public async Task GetRoles_ListsTheRoles()
    {
        Assert.Equal([RoleNames.Admin], await _admin.GetFromJsonAsync<List<string>>("/api/admin/roles"));
    }

    [Fact]
    public async Task GrantRole_GivesTheRoleAndRecordsWhoDidIt()
    {
        var ada = await factory.CreateApiClient().RegisterAsync("ada@example.com", "Ada");

        var response = await _admin.PutAsync($"/api/admin/users/{ada.Id}/roles/admin", null);
        var again = await _admin.PutAsync($"/api/admin/users/{ada.Id}/roles/admin", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        var changes = await _admin.GetFromJsonAsync<RoleChangePageResponse>("/api/admin/role-changes");
        var change = Assert.Single(changes!.Items);
        Assert.Equal((ada.Id, RoleNames.Admin, RoleChange.Granted, _adminUser.Id, AdminController.Origin),
            (change.User.Id, change.Role, change.Action, change.ChangedBy!.Id, change.Origin));
        Assert.Equal("Grace", change.ChangedBy.DisplayName);
    }

    [Fact]
    public async Task RevokeRole_RemovesTheRole()
    {
        var ada = await factory.CreateApiClient().RegisterAdminAsync(factory, "ada@example.com");

        var response = await _admin.DeleteAsync($"/api/admin/users/{ada.Id}/roles/admin");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var page = await _admin.GetFromJsonAsync<AdminUserPageResponse>("/api/admin/users?search=ada@");
        Assert.Empty(Assert.Single(page!.Items).Roles);
    }

    [Fact]
    public async Task RevokeRole_DoesNotLetAnAdminRemoveTheirOwnAdminRole()
    {
        await factory.CreateApiClient().RegisterAdminAsync(factory, "ada@example.com");

        var response = await _admin.DeleteAsync($"/api/admin/users/{_adminUser.Id}/roles/admin");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("You cannot remove your own admin role. Ask another admin.", problem!.Title);
    }

    [Theory]
    [InlineData("/api/admin/users/999999/roles/admin", "This user does not exist.")]
    [InlineData("/api/admin/users/{ada}/roles/wizard", "The role 'wizard' does not exist.")]
    public async Task GrantRole_ReturnsNotFoundForAnUnknownUserOrRole(string url, string title)
    {
        var ada = await factory.CreateApiClient().RegisterAsync("ada@example.com");

        var response = await _admin.PutAsync(url.Replace("{ada}", ada.Id.ToString()), null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(title, (await response.Content.ReadFromJsonAsync<ProblemDetails>())!.Title);
    }

    [Fact]
    public async Task GetRoleChanges_ListsTheNewestFirst()
    {
        var ada = await factory.CreateApiClient().RegisterAsync("ada@example.com");
        await _admin.PutAsync($"/api/admin/users/{ada.Id}/roles/admin", null);
        await _admin.DeleteAsync($"/api/admin/users/{ada.Id}/roles/admin");

        var changes = await _admin.GetFromJsonAsync<RoleChangePageResponse>("/api/admin/role-changes");

        Assert.Equal([RoleChange.Revoked, RoleChange.Granted], changes!.Items.Select(c => c.Action));
        Assert.Equal(2, changes.TotalCount);
    }

    [Theory]
    [InlineData("/api/admin/users?pageSize=0", "pageSize")]
    [InlineData("/api/admin/role-changes?page=0", "page")]
    public async Task Lists_RejectInvalidPagination(string url, string invalidParameter)
    {
        var response = await _admin.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal([invalidParameter], problem!.Errors.Keys);
    }
}
