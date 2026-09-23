using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Tests.Infrastructure;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Tests;

/// <summary>Who can create and see private and public activities.</summary>
[Collection(ApiCollection.Name)]
public class ActivityVisibilityTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _visitor = factory.CreateApiClient();
    private readonly HttpClient _ada = factory.CreateApiClient();
    private readonly HttpClient _bob = factory.CreateApiClient();
    private readonly HttpClient _admin = factory.CreateApiClient();

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        await _ada.RegisterAsync("ada@example.com", "Ada");
        await _bob.RegisterAsync("bob@example.com", "Bob");
        await _admin.RegisterAdminAsync(factory, "admin@example.com", "Grace");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Create_RequiresASignedInUser()
    {
        var response = await _visitor.PostAsJsonAsync("/api/activities", Request("Title"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(await TitlesAsync(_admin));
    }

    [Fact]
    public async Task Create_MakesAPrivateActivityOwnedByTheUserByDefault()
    {
        var activity = await CreateAsync(_ada, Request("Ada's notes"));

        Assert.Equal(ActivityVisibility.Private, activity.Visibility);
        Assert.Equal(await UserIdAsync("ada@example.com"), await OwnerIdAsync(activity.Id));
    }

    [Fact]
    public async Task Create_RefusesAPublicActivityFromAUserWhoCannotPublish()
    {
        var response = await _ada.PostAsJsonAsync("/api/activities", Request("Title", ActivityVisibility.Public));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("Only admins can create public activities.", problem!.Title);
        Assert.Empty(await TitlesAsync(_ada));
    }

    [Fact]
    public async Task Create_LetsAnAdminCreateAPublicActivityWithoutOwner()
    {
        var activity = await CreateAsync(_admin, Request("Cell biology", ActivityVisibility.Public));

        Assert.Equal(ActivityVisibility.Public, activity.Visibility);
        Assert.Null(await OwnerIdAsync(activity.Id));
    }

    [Fact]
    public async Task Create_LetsAnAdminCreateAPrivateActivity()
    {
        var activity = await CreateAsync(_admin, Request("Grace's notes", ActivityVisibility.Private));

        Assert.Equal(await UserIdAsync("admin@example.com"), await OwnerIdAsync(activity.Id));
    }

    [Fact]
    public async Task Create_RejectsAnUnknownVisibility()
    {
        var response = await _admin.PostAsJsonAsync("/api/activities", Request("Title", "friends"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal(["visibility"], problem!.Errors.Keys);
    }

    [Fact]
    public async Task List_ShowsPublicActivitiesAndOnlyTheViewersOwnPrivateActivities()
    {
        await CreateAsync(_admin, Request("Public", ActivityVisibility.Public));
        await CreateAsync(_ada, Request("Ada's"));
        await CreateAsync(_bob, Request("Bob's"));
        await CreateAsync(_admin, Request("Grace's"));

        Assert.Equal(["Public"], await TitlesAsync(_visitor));
        Assert.Equal(["Ada's", "Public"], await TitlesAsync(_ada));
        Assert.Equal(["Bob's", "Public"], await TitlesAsync(_bob));
        // Admins can publish, but they do not see the private activities of others.
        Assert.Equal(["Grace's", "Public"], await TitlesAsync(_admin));
    }

    [Fact]
    public async Task List_CountsOnlyTheVisibleActivities()
    {
        await CreateAsync(_ada, Request("Ada's"));
        await CreateAsync(_admin, Request("Public", ActivityVisibility.Public));

        var page = await _bob.GetFromJsonAsync<ActivityPageResponse>("/api/activities");

        Assert.Equal(1, page!.TotalCount);
    }

    [Fact]
    public async Task GetById_HidesThePrivateActivitiesOfOthers()
    {
        var activity = await CreateAsync(_ada, Request("Ada's"));
        var url = $"/api/activities/{activity.Id}";

        Assert.Equal(HttpStatusCode.OK, (await _ada.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _bob.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _admin.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _visitor.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task GetById_ShowsPublicActivitiesToEveryone()
    {
        var activity = await CreateAsync(_admin, Request("Public", ActivityVisibility.Public));

        var response = await _visitor.GetFromJsonAsync<ActivityResponse>($"/api/activities/{activity.Id}");

        Assert.Equal(ActivityVisibility.Public, response!.Visibility);
    }

    [Fact]
    public async Task ThemesAndCourses_OfOtherUsersPrivateActivitiesAreNotRevealed()
    {
        await CreateAsync(_admin, Request("Public", ActivityVisibility.Public, ["Biology"], ["BIO 101"]));
        await CreateAsync(_ada, Request("Ada's", ActivityVisibility.Private, ["Biology", "Secret project"], ["ADA 999"]));

        Assert.Equal(["Biology"], await NamesAsync(_bob, "/api/themes"));
        Assert.Equal(["BIO 101"], await NamesAsync(_bob, "/api/courses"));
        Assert.Equal(["Biology"], await NamesAsync(_visitor, "/api/themes"));
        Assert.Equal(["Biology", "Secret project"], await NamesAsync(_ada, "/api/themes"));
        Assert.Equal(["ADA 999", "BIO 101"], await NamesAsync(_ada, "/api/courses"));
    }

    [Fact]
    public async Task Database_RejectsAPublicActivityWithAnOwnerAndAPrivateOneWithout()
    {
        var activity = await CreateAsync(_ada, Request("Ada's"));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await Assert.ThrowsAnyAsync<Exception>(() => db.RevisionActivities.Where(a => a.Id == activity.Id)
            .ExecuteUpdateAsync(set => set.SetProperty(a => a.Visibility, ActivityVisibility.Public)));
        await Assert.ThrowsAnyAsync<Exception>(() => db.RevisionActivities.Where(a => a.Id == activity.Id)
            .ExecuteUpdateAsync(set => set.SetProperty(a => a.OwnerId, (int?)null)));
    }

    private static CreateActivityRequest Request(
        string title, string? visibility = null, List<string?>? themes = null, List<string?>? courses = null) =>
        new(title, null, themes ?? ["Biology"],
            [new CreateModuleRequest("reading", JsonSerializer.SerializeToElement(new { body = "Text" }))],
            courses, visibility);

    private static async Task<ActivityResponse> CreateAsync(HttpClient client, CreateActivityRequest request)
    {
        var response = await client.PostAsJsonAsync("/api/activities", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }

    private static async Task<List<string>> TitlesAsync(HttpClient client)
    {
        var page = await client.GetFromJsonAsync<ActivityPageResponse>("/api/activities");
        return page!.Items.Select(a => a.Title).ToList();
    }

    private static async Task<List<string>> NamesAsync(HttpClient client, string url) =>
        (await client.GetFromJsonAsync<List<ThemeResponse>>(url))!.Select(t => t.Name).ToList();

    private async Task<int> UserIdAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.Where(u => u.Email == email).Select(u => u.Id).SingleAsync();
    }

    private async Task<int?> OwnerIdAsync(int activityId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.RevisionActivities.Where(a => a.Id == activityId).Select(a => a.OwnerId).SingleAsync();
    }
}
