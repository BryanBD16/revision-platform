using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Tests.Infrastructure;
using RevisionPlatform.Api.Typing;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class TypingEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _ada = factory.CreateApiClient();
    private readonly HttpClient _visitor = factory.CreateApiClient();

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        await _ada.RegisterAsync("ada@example.com", "Ada");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task SaveResult_StoresTheTimedTest()
    {
        var response = await _ada.PostAsJsonAsync("/api/typing/results",
            new SaveTypingResultRequest("timed", 120, 54, 71));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = (await response.Content.ReadFromJsonAsync<TypingResultResponse>())!;
        Assert.Equal(("timed", 120, 54, 71), (result.Mode, result.DurationSeconds, result.AverageWpm, result.PeakWpm));
        Assert.InRange(result.PlayedAt, DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow.AddMinutes(1));
    }

    [Fact]
    public async Task SaveResult_AcceptsATestWithoutTyping()
    {
        var response = await _ada.PostAsJsonAsync("/api/typing/results",
            new SaveTypingResultRequest("timed", 60, 0, 0));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task SaveResult_RequiresASignedInUser()
    {
        var response = await _visitor.PostAsJsonAsync("/api/typing/results",
            new SaveTypingResultRequest("timed", 60, 40, 50));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    public static TheoryData<string, string> InvalidResults => new()
    {
        { """{ "durationSeconds": 60, "averageWpm": 40, "peakWpm": 50 }""", "mode" },
        { """{ "mode": "sprint", "durationSeconds": 60, "averageWpm": 40, "peakWpm": 50 }""", "mode" },
        { """{ "mode": "timed", "averageWpm": 40, "peakWpm": 50 }""", "durationSeconds" },
        { """{ "mode": "timed", "durationSeconds": 90, "averageWpm": 40, "peakWpm": 50 }""", "durationSeconds" },
        { """{ "mode": "timed", "durationSeconds": 60, "peakWpm": 50 }""", "averageWpm" },
        { """{ "mode": "timed", "durationSeconds": 60, "averageWpm": -1, "peakWpm": 50 }""", "averageWpm" },
        { """{ "mode": "timed", "durationSeconds": 60, "averageWpm": 301, "peakWpm": 301 }""", "averageWpm" },
        { """{ "mode": "timed", "durationSeconds": 60, "averageWpm": 40 }""", "peakWpm" },
        { """{ "mode": "timed", "durationSeconds": 60, "averageWpm": 40, "peakWpm": 301 }""", "peakWpm" },
        { """{ "mode": "timed", "durationSeconds": 60, "averageWpm": 40, "peakWpm": 39 }""", "peakWpm" },
    };

    [Theory]
    [MemberData(nameof(InvalidResults))]
    public async Task SaveResult_RejectsAnInvalidResult(string json, string field)
    {
        var response = await _ada.PostAsync("/api/typing/results",
            new StringContent(json, System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
    }

    [Fact]
    public async Task GetResults_ReturnsTheUserResultsNewestFirst()
    {
        await SaveResultAsync(_ada, 60, 30);
        await SaveResultAsync(_ada, 300, 50);
        await SaveResultAsync(_ada, 120, 40);
        var bob = factory.CreateApiClient();
        await bob.RegisterAsync("bob@example.com", "Bob");
        await SaveResultAsync(bob, 60, 90);

        var page = await _ada.GetFromJsonAsync<TypingResultPageResponse>("/api/typing/results?pageSize=2");

        Assert.Equal([(120, 40), (300, 50)], page!.Items.Select(r => (r.DurationSeconds!.Value, r.AverageWpm)));
        Assert.Equal((1, 2, 3), (page.Page, page.PageSize, page.TotalCount));
    }

    [Fact]
    public async Task GetResults_RequiresASignedInUser()
    {
        var response = await _visitor.GetAsync("/api/typing/results");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetResults_RejectsAnInvalidPage()
    {
        var response = await _ada.GetAsync("/api/typing/results?page=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static async Task SaveResultAsync(HttpClient client, int durationSeconds, int averageWpm)
    {
        var response = await client.PostAsJsonAsync("/api/typing/results",
            new SaveTypingResultRequest("timed", durationSeconds, averageWpm, averageWpm + 10));
        response.EnsureSuccessStatusCode();
    }
}
