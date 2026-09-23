using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
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
            new CreateActivityRequest("  Cell biology  ", "  Chapter 3  ", ["Biology", "Cells"], [Reading("Text")]));

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
        var activity = await CreateAsync(new CreateActivityRequest("Title", "   ", ["Biology"], [Reading("Text")]));

        Assert.Null(activity.Description);
    }

    [Fact]
    public async Task GetById_ReturnsStoredActivity()
    {
        var created = await CreateAsync(new CreateActivityRequest("Cell biology", null, ["Biology"], [Reading("Text")]));

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
        await CreateAsync(new CreateActivityRequest("First", null, ["Biology"], [Reading("Text")]));
        await CreateAsync(new CreateActivityRequest("Second", null, ["Biology"], [Reading("Text")]));

        var activities = await _client.GetFromJsonAsync<List<ActivitySummaryResponse>>("/api/activities");

        Assert.NotNull(activities);
        Assert.Equal(["Second", "First"], activities.Select(a => a.Title));
    }

    [Fact]
    public async Task GetAll_ReturnsEmptyListWhenThereAreNoActivities()
    {
        var activities = await _client.GetFromJsonAsync<List<ActivitySummaryResponse>>("/api/activities");

        Assert.NotNull(activities);
        Assert.Empty(activities);
    }

    [Fact]
    public async Task Create_ReusesExistingThemeIgnoringCase()
    {
        var first = await CreateAsync(new CreateActivityRequest("First", null, ["Biology"], [Reading("Text")]));
        var second = await CreateAsync(new CreateActivityRequest("Second", null, ["  biology "], [Reading("Text")]));

        var theme = Assert.Single(second.Themes);
        Assert.Equal(first.Themes[0].Id, theme.Id);
        Assert.Equal("Biology", theme.Name);
    }

    [Fact]
    public async Task Create_MergesDuplicateThemesInRequest()
    {
        var activity = await CreateAsync(new CreateActivityRequest("Title", null, ["Biology", "BIOLOGY", "Cells"], [Reading("Text")]));

        Assert.Equal(["Biology", "Cells"], activity.Themes.Select(t => t.Name));
    }

    public static TheoryData<CreateActivityRequest, string> InvalidRequests => new()
    {
        { new CreateActivityRequest(null, null, ["Biology"], [Reading("Text")]), "title" },
        { new CreateActivityRequest("   ", null, ["Biology"], [Reading("Text")]), "title" },
        { new CreateActivityRequest(new string('a', 201), null, ["Biology"], [Reading("Text")]), "title" },
        { new CreateActivityRequest("Title", new string('a', 2001), ["Biology"], [Reading("Text")]), "description" },
        { new CreateActivityRequest("Title", null, null, [Reading("Text")]), "themes" },
        { new CreateActivityRequest("Title", null, [], [Reading("Text")]), "themes" },
        { new CreateActivityRequest("Title", null, ["Biology", "  "], [Reading("Text")]), "themes" },
        { new CreateActivityRequest("Title", null, [new string('a', 101)], [Reading("Text")]), "themes" },
        { new CreateActivityRequest("Title", null, ["Biology"], null), "modules" },
        { new CreateActivityRequest("Title", null, ["Biology"], []), "modules" },
        { new CreateActivityRequest("Title", null, ["Biology"], [null]), "modules[0]" },
        { new CreateActivityRequest("Title", null, ["Biology"], [new CreateModuleRequest(null, Json(new { body = "Text" }))]), "modules[0].type" },
        { new CreateActivityRequest("Title", null, ["Biology"], [new CreateModuleRequest("unknown", Json(new { body = "Text" }))]), "modules[0].type" },
        { new CreateActivityRequest("Title", null, ["Biology"], [Reading("Text"), Reading("   ")]), "modules[1].content" },
        { new CreateActivityRequest("Title", null, ["Biology"], [new CreateModuleRequest("reading", null)]), "modules[0].content" },
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

        var activities = await _client.GetFromJsonAsync<List<ActivitySummaryResponse>>("/api/activities");
        Assert.Empty(activities!);
    }

    [Fact]
    public async Task Create_AcceptsMaximumLengths()
    {
        var activity = await CreateAsync(new CreateActivityRequest(
            new string('t', 200), new string('d', 2000), [new string('n', 100)], [Reading("Text")]));

        Assert.Equal(200, activity.Title.Length);
    }

    [Fact]
    public async Task Create_StoresModulesInOrderWithNormalizedContent()
    {
        var created = await CreateAsync(new CreateActivityRequest("Title", null, ["Biology"],
        [
            new CreateModuleRequest("reading", Json(new { title = "  Introduction ", body = "  First text  " })),
            Reading("Second text"),
        ]));

        var activity = await _client.GetFromJsonAsync<ActivityResponse>($"/api/activities/{created.Id}");

        Assert.NotNull(activity);
        Assert.Equal([0, 1], activity.Modules.Select(m => m.Position));
        Assert.All(activity.Modules, m => Assert.Equal("reading", m.Type));
        Assert.Equal("Introduction", activity.Modules[0].Content.GetProperty("title").GetString());
        Assert.Equal("First text", activity.Modules[0].Content.GetProperty("body").GetString());
        Assert.Equal(JsonValueKind.Null, activity.Modules[1].Content.GetProperty("title").ValueKind);
        Assert.Equal("Second text", activity.Modules[1].Content.GetProperty("body").GetString());
    }

    [Fact]
    public async Task Create_AcceptsMultipleChoiceModules()
    {
        var created = await CreateAsync(new CreateActivityRequest("Title", null, ["Biology"],
        [
            new CreateModuleRequest("multiple-choice", Json(new
            {
                question = "What is a cell?",
                choices = new[] { new { id = "a", text = "A unit of life" }, new { id = "b", text = "A planet" } },
                correctChoiceIds = new[] { "a" },
            })),
        ]));

        var module = Assert.Single(created.Modules);
        Assert.Equal("multiple-choice", module.Type);
        Assert.Equal("What is a cell?", module.Content.GetProperty("question").GetString());
    }

    [Fact]
    public async Task GetAll_ReturnsModuleCount()
    {
        await CreateAsync(new CreateActivityRequest("Title", null, ["Biology"], [Reading("One"), Reading("Two")]));

        var activities = await _client.GetFromJsonAsync<List<ActivitySummaryResponse>>("/api/activities");

        Assert.Equal(2, Assert.Single(activities!).ModuleCount);
    }

    [Fact]
    public async Task Create_ReportsErrorsFromEachModuleType()
    {
        var response = await _client.PostAsJsonAsync("/api/activities", new CreateActivityRequest(
            "Title", null, ["Biology"], [new CreateModuleRequest("reading", Json(new { body = "" }))]));

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal(["The text to read is required."], problem!.Errors["modules[0].content"]);
    }

    private static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value);

    private static CreateModuleRequest Reading(string body) => new("reading", Json(new { body }));

    private async Task<ActivityResponse> CreateAsync(CreateActivityRequest request)
    {
        var response = await _client.PostAsJsonAsync("/api/activities", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }
}
