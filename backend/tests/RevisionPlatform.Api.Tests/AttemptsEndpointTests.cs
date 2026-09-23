using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Attempts;
using RevisionPlatform.Api.Tests.Infrastructure;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class AttemptsEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _ada = factory.CreateApiClient();
    private readonly HttpClient _bob = factory.CreateApiClient();
    private readonly HttpClient _visitor = factory.CreateApiClient();
    private ActivityResponse _activity = null!;

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        await _ada.RegisterAsync("ada@example.com", "Ada");
        await _bob.RegisterAsync("bob@example.com", "Bob");
        _activity = await CreateActivityAsync(_ada, "Cell biology", [Reading(), MultipleChoice(), Reading()]);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Save_StoresTheScoresWithACopyOfTheActivity()
    {
        var response = await _ada.PostAsJsonAsync("/api/attempts", new SaveAttemptRequest(_activity.Id,
        [
            Result(0, "  Introduction "),
            Result(1, "What is a cell?", 1, 1),
            Result(2, null),
        ]));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var attempt = (await response.Content.ReadFromJsonAsync<AttemptResponse>())!;
        Assert.Equal($"/api/attempts/{attempt.Id}", response.Headers.Location?.OriginalString);
        Assert.Equal((_activity.Id, "Cell biology", 1, 1), (attempt.ActivityId, attempt.ActivityTitle, attempt.Score, attempt.MaxScore));
        Assert.Equal(["reading", "multiple-choice", "reading"], attempt.Modules.Select(m => m.ModuleType));
        Assert.Equal(["Introduction", "What is a cell?", null], attempt.Modules.Select(m => m.Label));
        Assert.Equal([null, 1, null], attempt.Modules.Select(m => m.Score));
        Assert.Equal(_activity.Modules.Select(m => (int?)m.Id), attempt.Modules.Select(m => m.ModuleId));
        Assert.InRange(attempt.CompletedAt, DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow.AddMinutes(1));
    }

    [Fact]
    public async Task Save_AddsUpTheGradedModulesOnly()
    {
        var activity = await CreateActivityAsync(_ada, "Two questions", [MultipleChoice(), Reading(), MultipleChoice()]);

        var attempt = await SaveAsync(_ada, new SaveAttemptRequest(activity.Id,
            [Result(0, "Q1", 1, 1, activity), Result(1, "Text", activity: activity), Result(2, "Q2", 0, 1, activity)]));

        Assert.Equal((1, 2), (attempt.Score, attempt.MaxScore));
    }

    [Fact]
    public async Task Save_HasNoGlobalScoreWhenNoModuleIsGraded()
    {
        var activity = await CreateActivityAsync(_ada, "Reading only", [Reading()]);

        var attempt = await SaveAsync(_ada, new SaveAttemptRequest(activity.Id, [Result(0, "Text", activity: activity)]));

        Assert.Null(attempt.Score);
        Assert.Null(attempt.MaxScore);
    }

    [Fact]
    public async Task Save_LetsAnyoneSignedInSaveAPublicActivity()
    {
        var admin = factory.CreateApiClient();
        await admin.RegisterAdminAsync(factory, "grace@example.com");
        var activity = await CreateActivityAsync(admin, "Public", [Reading()], ActivityVisibility.Public);

        var response = await _bob.PostAsJsonAsync("/api/attempts",
            new SaveAttemptRequest(activity.Id, [Result(0, "Text", activity: activity)]));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Save_RequiresASignedInUser()
    {
        var response = await _visitor.PostAsJsonAsync("/api/attempts", ValidRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Save_ReturnsNotFoundForAnActivityTheUserCannotSee()
    {
        var hidden = await _bob.PostAsJsonAsync("/api/attempts", ValidRequest());
        var unknown = await _ada.PostAsJsonAsync("/api/attempts", ValidRequest() with { ActivityId = 999999 });

        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
    }

    public static TheoryData<string, string> InvalidRequests => new()
    {
        { "missing activity", "activityId" },
        { "missing module", "modules" },
        { "extra module", "modules" },
        { "modules in another order", "modules" },
        { "module of another activity", "modules" },
        { "score above the maximum", "modules[1].score" },
        { "negative score", "modules[1].score" },
        { "maximum score of zero", "modules[1].score" },
        { "score without maximum", "modules[1].score" },
        { "label too long", "modules[0].label" },
    };

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task Save_RejectsAnInvalidAttempt(string problem, string invalidField)
    {
        var other = await CreateActivityAsync(_ada, "Other", [Reading()]);
        var valid = ValidRequest().Modules!;
        var request = problem switch
        {
            "missing activity" => ValidRequest() with { ActivityId = null },
            "missing module" => ValidRequest() with { Modules = valid[..2] },
            "extra module" => ValidRequest() with { Modules = [.. valid, valid[0]] },
            "modules in another order" => ValidRequest() with { Modules = [valid[1], valid[0], valid[2]] },
            "module of another activity" => ValidRequest() with { Modules = [valid[0], valid[1], Result(0, "X", activity: other)] },
            "score above the maximum" => WithSecondModule(valid, 2, 1),
            "negative score" => WithSecondModule(valid, -1, 1),
            "maximum score of zero" => WithSecondModule(valid, 0, 0),
            "score without maximum" => WithSecondModule(valid, 1, null),
            _ => ValidRequest() with { Modules = [valid[0]! with { Label = new string('l', 1001) }, valid[1], valid[2]] },
        };

        var response = await _ada.PostAsJsonAsync("/api/attempts", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var details = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal([invalidField], details!.Errors.Keys);
    }

    private SaveAttemptRequest WithSecondModule(List<SaveAttemptModuleRequest?> valid, int? score, int? maxScore) =>
        ValidRequest() with { Modules = [valid[0], valid[1]! with { Score = score, MaxScore = maxScore }, valid[2]] };

    private SaveAttemptRequest ValidRequest() =>
        new(_activity.Id, [Result(0, "Introduction"), Result(1, "Question", 1, 1), Result(2, "Summary")]);

    private SaveAttemptModuleRequest Result(
        int index, string? label, int? score = null, int? maxScore = null, ActivityResponse? activity = null) =>
        new((activity ?? _activity).Modules[index].Id, label, score, maxScore);

    private static async Task<AttemptResponse> SaveAsync(HttpClient client, SaveAttemptRequest request)
    {
        var response = await client.PostAsJsonAsync("/api/attempts", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AttemptResponse>())!;
    }

    private static SaveModuleRequest Reading() =>
        new("reading", JsonSerializer.SerializeToElement(new { body = "Text" }));

    private static SaveModuleRequest MultipleChoice() =>
        new("multiple-choice", JsonSerializer.SerializeToElement(new
        {
            question = "What is a cell?",
            choices = new[] { new { id = "a", text = "A unit of life" }, new { id = "b", text = "A planet" } },
            correctChoiceIds = new[] { "a" },
        }));

    private static async Task<ActivityResponse> CreateActivityAsync(
        HttpClient client, string title, List<SaveModuleRequest?> modules, string? visibility = null)
    {
        var response = await client.PostAsJsonAsync("/api/activities",
            new SaveActivityRequest(title, null, ["Biology"], modules, null, visibility));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }
}
