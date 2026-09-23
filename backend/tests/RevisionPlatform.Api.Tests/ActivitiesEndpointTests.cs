using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Tests.Infrastructure;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class ActivitiesEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateClient();

    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Create_ReturnsCreatedActivity()
    {
        var before = DateTime.UtcNow;

        var response = await _client.PostAsJsonAsync("/api/activities",
            new CreateActivityRequest("  Cell biology  ", "  Chapter 3  ", ["Biology", "Cells"]));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var activity = await response.Content.ReadFromJsonAsync<ActivityResponse>();
        Assert.NotNull(activity);
        Assert.Equal($"/api/activities/{activity.Id}", response.Headers.Location?.AbsolutePath);
        Assert.Equal("Cell biology", activity.Title);
        Assert.Equal("Chapter 3", activity.Description);
        Assert.Equal(["Biology", "Cells"], activity.Themes.Select(t => t.Name));
        Assert.InRange(activity.CreatedAt, before.AddSeconds(-1), DateTime.UtcNow.AddSeconds(1));
        Assert.Equal(DateTimeKind.Utc, activity.CreatedAt.Kind);
    }

    [Fact]
    public async Task Create_StoresBlankDescriptionAsNull()
    {
        var activity = await CreateAsync(new CreateActivityRequest("Title", "   ", ["Biology"]));

        Assert.Null(activity.Description);
    }

    [Fact]
    public async Task GetById_ReturnsStoredActivity()
    {
        var created = await CreateAsync(new CreateActivityRequest("Cell biology", null, ["Biology"]));

        var activity = await _client.GetFromJsonAsync<ActivityResponse>($"/api/activities/{created.Id}");

        Assert.NotNull(activity);
        Assert.Equal(created.Id, activity.Id);
        Assert.Equal("Cell biology", activity.Title);
        Assert.Equal(["Biology"], activity.Themes.Select(t => t.Name));
    }

    [Fact]
    public async Task GetById_ReturnsNotFoundForUnknownId()
    {
        var response = await _client.GetAsync("/api/activities/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsActivitiesNewestFirst()
    {
        await CreateAsync(new CreateActivityRequest("First", null, ["Biology"]));
        await CreateAsync(new CreateActivityRequest("Second", null, ["Biology"]));

        var activities = await _client.GetFromJsonAsync<List<ActivityResponse>>("/api/activities");

        Assert.NotNull(activities);
        Assert.Equal(["Second", "First"], activities.Select(a => a.Title));
    }

    [Fact]
    public async Task GetAll_ReturnsEmptyListWhenThereAreNoActivities()
    {
        var activities = await _client.GetFromJsonAsync<List<ActivityResponse>>("/api/activities");

        Assert.NotNull(activities);
        Assert.Empty(activities);
    }

    [Fact]
    public async Task Create_ReusesExistingThemeIgnoringCase()
    {
        var first = await CreateAsync(new CreateActivityRequest("First", null, ["Biology"]));
        var second = await CreateAsync(new CreateActivityRequest("Second", null, ["  biology "]));

        var theme = Assert.Single(second.Themes);
        Assert.Equal(first.Themes[0].Id, theme.Id);
        Assert.Equal("Biology", theme.Name);
    }

    [Fact]
    public async Task Create_MergesDuplicateThemesInRequest()
    {
        var activity = await CreateAsync(new CreateActivityRequest("Title", null, ["Biology", "BIOLOGY", "Cells"]));

        Assert.Equal(["Biology", "Cells"], activity.Themes.Select(t => t.Name));
    }

    public static TheoryData<CreateActivityRequest, string> InvalidRequests => new()
    {
        { new CreateActivityRequest(null, null, ["Biology"]), "title" },
        { new CreateActivityRequest("   ", null, ["Biology"]), "title" },
        { new CreateActivityRequest(new string('a', 201), null, ["Biology"]), "title" },
        { new CreateActivityRequest("Title", new string('a', 2001), ["Biology"]), "description" },
        { new CreateActivityRequest("Title", null, null), "themes" },
        { new CreateActivityRequest("Title", null, []), "themes" },
        { new CreateActivityRequest("Title", null, ["Biology", "  "]), "themes" },
        { new CreateActivityRequest("Title", null, [new string('a', 101)]), "themes" },
    };

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task Create_RejectsInvalidRequest(CreateActivityRequest request, string invalidField)
    {
        var response = await _client.PostAsJsonAsync("/api/activities", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal([invalidField], problem.Errors.Keys);

        var activities = await _client.GetFromJsonAsync<List<ActivityResponse>>("/api/activities");
        Assert.Empty(activities!);
    }

    [Fact]
    public async Task Create_AcceptsMaximumLengths()
    {
        var activity = await CreateAsync(new CreateActivityRequest(
            new string('t', 200), new string('d', 2000), [new string('n', 100)]));

        Assert.Equal(200, activity.Title.Length);
    }

    private async Task<ActivityResponse> CreateAsync(CreateActivityRequest request)
    {
        var response = await _client.PostAsJsonAsync("/api/activities", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }
}
