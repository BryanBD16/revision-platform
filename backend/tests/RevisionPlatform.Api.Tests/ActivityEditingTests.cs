using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Themes;
using RevisionPlatform.Api.Tests.Infrastructure;

namespace RevisionPlatform.Api.Tests;

/// <summary>Who can edit and delete which activities.</summary>
[Collection(ApiCollection.Name)]
public class ActivityEditingTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _visitor = factory.CreateApiClient();
    private readonly HttpClient _ada = factory.CreateApiClient();
    private readonly HttpClient _bob = factory.CreateApiClient();
    private readonly HttpClient _grace = factory.CreateApiClient();
    private readonly HttpClient _alan = factory.CreateApiClient();

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        await _ada.RegisterAsync("ada@example.com", "Ada");
        await _bob.RegisterAsync("bob@example.com", "Bob");
        await _grace.RegisterAdminAsync(factory, "grace@example.com", "Grace");
        await _alan.RegisterAdminAsync(factory, "alan@example.com", "Alan");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetById_LetsTheOwnerEditTheirPrivateActivity()
    {
        var activity = await CreateAsync(_ada, Request("Ada's notes"));

        var detail = await GetAsync(_ada, activity.Id);

        Assert.True(detail.CanEdit);
        // Who last edited a private activity is always its owner, so it is not given.
        Assert.Null(detail.LastEditedBy);
    }

    [Fact]
    public async Task GetById_LetsEveryAdminEditAPublicActivityAndSeeWhoLastEditedIt()
    {
        var activity = await CreateAsync(_grace, Request("Cells", ActivityVisibility.Public));

        var detail = await GetAsync(_alan, activity.Id);

        Assert.True(detail.CanEdit);
        Assert.Equal("Grace", detail.LastEditedBy?.DisplayName);
    }

    [Fact]
    public async Task GetById_DoesNotLetOthersEditAPublicActivity()
    {
        var activity = await CreateAsync(_grace, Request("Cells", ActivityVisibility.Public));

        foreach (var client in new[] { _ada, _visitor })
        {
            var detail = await GetAsync(client, activity.Id);
            Assert.False(detail.CanEdit);
            Assert.Null(detail.LastEditedBy);
        }
    }

    [Fact]
    public async Task Update_ReplacesTheActivity()
    {
        var activity = await CreateAsync(_ada, Request("Old title"));

        var response = await _ada.PutAsJsonAsync($"/api/activities/{activity.Id}", new SaveActivityRequest(
            "  New title ", "  New description ", ["Cells", "Mitosis"], [Reading("New text", activity.Modules[0].Id)],
            ["BIO 101"]));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
        Assert.Equal(("New title", "New description"), (updated.Title, updated.Description));
        Assert.Equal(["Cells", "Mitosis"], updated.Themes.Select(t => t.Name));
        Assert.Equal(["BIO 101"], updated.Courses.Select(c => c.Name));
        Assert.Equal(ActivityVisibility.Private, updated.Visibility);
        Assert.True(updated.UpdatedAt > activity.UpdatedAt);
        Assert.Equal(activity.CreatedAt, updated.CreatedAt);
        var stored = await GetAsync(_ada, activity.Id);
        Assert.Equal(("New title", "New text"), (stored.Title, stored.Modules[0].Content.GetProperty("body").GetString()));
        Assert.Equal(["BIO 101"], stored.Courses.Select(c => c.Name));
    }

    [Fact]
    public async Task Update_KeepsTheIdsOfTheModulesItKeeps()
    {
        var activity = await CreateAsync(_ada, Request("Title", modules: [Reading("One"), Reading("Two"), Reading("Three")]));
        var (one, two, three) = (activity.Modules[0].Id, activity.Modules[1].Id, activity.Modules[2].Id);

        var updated = await UpdateAsync(_ada, activity.Id, Request("Title",
            modules: [Reading("Three edited", three), Reading("New"), Reading("One", one)]));

        Assert.Equal([three, one], updated.Modules.Where(m => m.Id != updated.Modules[1].Id).Select(m => m.Id));
        Assert.DoesNotContain(updated.Modules, m => m.Id == two);
        Assert.Equal([0, 1, 2], updated.Modules.Select(m => m.Position));
        Assert.Equal(["Three edited", "New", "One"], updated.Modules.Select(m => m.Content.GetProperty("body").GetString()));
    }

    [Fact]
    public async Task Update_CanSwapTwoModules()
    {
        var activity = await CreateAsync(_ada, Request("Title", modules: [Reading("One"), Reading("Two")]));

        var updated = await UpdateAsync(_ada, activity.Id, Request("Title",
            modules: [Reading("Two", activity.Modules[1].Id), Reading("One", activity.Modules[0].Id)]));

        Assert.Equal([activity.Modules[1].Id, activity.Modules[0].Id], updated.Modules.Select(m => m.Id));
    }

    [Fact]
    public async Task Update_RejectsAModuleOfAnotherActivity()
    {
        var mine = await CreateAsync(_ada, Request("Mine"));
        var other = await CreateAsync(_ada, Request("Other"));

        var response = await _ada.PutAsJsonAsync($"/api/activities/{mine.Id}",
            Request("Mine", modules: [Reading("Text", other.Modules[0].Id)]));

        await AssertValidationProblemAsync(response, "modules[0].id");
    }

    [Fact]
    public async Task Update_RejectsAChangeOfModuleType()
    {
        var activity = await CreateAsync(_ada, Request("Title"));
        var matching = new SaveModuleRequest("matching", JsonSerializer.SerializeToElement(new
        {
            pairs = new[] { new { id = "p1", concept = "A", definition = "1" }, new { id = "p2", concept = "B", definition = "2" } },
        }), activity.Modules[0].Id);

        var response = await _ada.PutAsJsonAsync($"/api/activities/{activity.Id}", Request("Title", modules: [matching]));

        await AssertValidationProblemAsync(response, "modules[0].type");
    }

    [Fact]
    public async Task Update_RejectsTheSameModuleTwice()
    {
        var activity = await CreateAsync(_ada, Request("Title"));
        var id = activity.Modules[0].Id;

        var response = await _ada.PutAsJsonAsync($"/api/activities/{activity.Id}",
            Request("Title", modules: [Reading("A", id), Reading("B", id)]));

        await AssertValidationProblemAsync(response, "modules[1].id");
    }

    [Fact]
    public async Task Update_RejectsAnInvalidActivity()
    {
        var activity = await CreateAsync(_ada, Request("Title"));

        var response = await _ada.PutAsJsonAsync($"/api/activities/{activity.Id}", Request("   "));

        await AssertValidationProblemAsync(response, "title");
        Assert.Equal("Title", (await GetAsync(_ada, activity.Id)).Title);
    }

    [Fact]
    public async Task Create_RejectsModuleIds()
    {
        var response = await _ada.PostAsJsonAsync("/api/activities", Request("Title", modules: [Reading("Text", 1)]));

        await AssertValidationProblemAsync(response, "modules[0].id");
    }

    [Fact]
    public async Task Update_HidesTheActivitiesOfOthersAndRequiresSigningIn()
    {
        var activity = await CreateAsync(_ada, Request("Ada's"));
        var url = $"/api/activities/{activity.Id}";

        Assert.Equal(HttpStatusCode.NotFound, (await _bob.PutAsJsonAsync(url, Request("Bob's now"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _grace.PutAsJsonAsync(url, Request("Grace's now"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _visitor.PutAsJsonAsync(url, Request("Nobody's"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _ada.PutAsJsonAsync("/api/activities/999999", Request("X"))).StatusCode);
        Assert.Equal("Ada's", (await GetAsync(_ada, activity.Id)).Title);
    }

    [Fact]
    public async Task Update_DoesNotLetAUserEditAPublicActivity()
    {
        var activity = await CreateAsync(_grace, Request("Cells", ActivityVisibility.Public));

        var response = await _ada.PutAsJsonAsync($"/api/activities/{activity.Id}", Request("Ada's now"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("Only admins can edit public activities.", await TitleAsync(response));
    }

    [Fact]
    public async Task Update_LetsAnyAdminEditAPublicActivityAndRecordsWhoDidIt()
    {
        var activity = await CreateAsync(_grace, Request("Cells", ActivityVisibility.Public));

        var updated = await UpdateAsync(_alan, activity.Id, Request("Cells, edited"));

        Assert.Equal(ActivityVisibility.Public, updated.Visibility);
        Assert.Equal("Alan", updated.LastEditedBy?.DisplayName);
        Assert.Equal("Cells, edited", (await GetAsync(_visitor, activity.Id)).Title);
    }

    [Fact]
    public async Task Update_LetsAnAdminPublishTheirPrivateActivity()
    {
        var activity = await CreateAsync(_grace, Request("Grace's"));

        var updated = await UpdateAsync(_grace, activity.Id, Request("Grace's", ActivityVisibility.Public));

        Assert.Equal(ActivityVisibility.Public, updated.Visibility);
        Assert.True((await GetAsync(_alan, activity.Id)).CanEdit);
        Assert.False((await GetAsync(_visitor, activity.Id)).CanEdit);
    }

    [Fact]
    public async Task Update_GivesAPublicActivityMadePrivateToTheAdminWhoDidIt()
    {
        var activity = await CreateAsync(_grace, Request("Cells", ActivityVisibility.Public));

        await UpdateAsync(_alan, activity.Id, Request("Cells", ActivityVisibility.Private));

        Assert.True((await GetAsync(_alan, activity.Id)).CanEdit);
        Assert.Equal(HttpStatusCode.NotFound, (await _grace.GetAsync($"/api/activities/{activity.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _visitor.GetAsync($"/api/activities/{activity.Id}")).StatusCode);
    }

    [Fact]
    public async Task Update_DoesNotLetAUserChangeTheVisibility()
    {
        var activity = await CreateAsync(_ada, Request("Ada's"));

        var response = await _ada.PutAsJsonAsync($"/api/activities/{activity.Id}", Request("Ada's", ActivityVisibility.Public));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("Only admins can change the visibility of an activity.", await TitleAsync(response));
        Assert.Equal(ActivityVisibility.Private, (await GetAsync(_ada, activity.Id)).Visibility);
    }

    [Fact]
    public async Task Update_KeepsTheVisibilityWhenItIsNotGiven()
    {
        var activity = await CreateAsync(_grace, Request("Cells", ActivityVisibility.Public));

        var updated = await UpdateAsync(_grace, activity.Id, Request("Cells"));

        Assert.Equal(ActivityVisibility.Public, updated.Visibility);
    }

    [Fact]
    public async Task Update_StopsListingThemesNoActivityUsesAnymore()
    {
        var activity = await CreateAsync(_ada, Request("Title", themes: ["Old theme"]));

        await UpdateAsync(_ada, activity.Id, Request("Title", themes: ["New theme"]));

        var themes = await _ada.GetFromJsonAsync<List<ThemeResponse>>("/api/themes");
        Assert.Equal(["New theme"], themes!.Select(t => t.Name));
    }

    [Fact]
    public async Task Delete_RemovesTheActivityWithItsModulesAndThemes()
    {
        var activity = await CreateAsync(_ada, Request("Title", modules: [Reading("One"), Reading("Two")], themes: ["Cells"]));

        var response = await _ada.DeleteAsync($"/api/activities/{activity.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _ada.GetAsync($"/api/activities/{activity.Id}")).StatusCode);
        Assert.Empty((await _ada.GetFromJsonAsync<List<ThemeResponse>>("/api/themes"))!);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.RevisionModules.AnyAsync(m => m.ActivityId == activity.Id));
    }

    [Fact]
    public async Task Delete_HidesTheActivitiesOfOthersAndRequiresSigningIn()
    {
        var activity = await CreateAsync(_ada, Request("Ada's"));
        var url = $"/api/activities/{activity.Id}";

        Assert.Equal(HttpStatusCode.NotFound, (await _bob.DeleteAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _grace.DeleteAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _visitor.DeleteAsync(url)).StatusCode);
        Assert.Equal("Ada's", (await GetAsync(_ada, activity.Id)).Title);
    }

    [Fact]
    public async Task Delete_LetsOnlyAdminsDeleteAPublicActivity()
    {
        var activity = await CreateAsync(_grace, Request("Cells", ActivityVisibility.Public));
        var url = $"/api/activities/{activity.Id}";

        var byUser = await _ada.DeleteAsync(url);
        var byAdmin = await _alan.DeleteAsync(url);

        Assert.Equal(HttpStatusCode.Forbidden, byUser.StatusCode);
        Assert.Equal("Only admins can delete public activities.", await TitleAsync(byUser));
        Assert.Equal(HttpStatusCode.NoContent, byAdmin.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _visitor.GetAsync(url)).StatusCode);
    }

    private static SaveActivityRequest Request(
        string title, string? visibility = null, List<SaveModuleRequest?>? modules = null, List<string?>? themes = null) =>
        new(title, null, themes ?? ["Biology"], modules ?? [Reading("Text")], null, visibility);

    private static SaveModuleRequest Reading(string body, int? id = null) =>
        new("reading", JsonSerializer.SerializeToElement(new { body }), id);

    private static async Task<ActivityResponse> UpdateAsync(HttpClient client, int id, SaveActivityRequest request)
    {
        var response = await client.PutAsJsonAsync($"/api/activities/{id}", request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }

    private static async Task<string?> TitleAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<ProblemDetails>())!.Title;

    private static async Task AssertValidationProblemAsync(HttpResponseMessage response, string invalidField)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal([invalidField], problem!.Errors.Keys);
    }

    private static async Task<ActivityResponse> CreateAsync(HttpClient client, SaveActivityRequest request)
    {
        var response = await client.PostAsJsonAsync("/api/activities", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }

    private static async Task<ActivityResponse> GetAsync(HttpClient client, int id)
    {
        var response = await client.GetAsync($"/api/activities/{id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }
}
