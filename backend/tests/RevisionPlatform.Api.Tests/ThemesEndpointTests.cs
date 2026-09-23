using System.Net.Http.Json;
using System.Text.Json;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Tests.Infrastructure;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class ThemesEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateApiClient();

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        // Creating an activity requires a signed-in user (see ActivityVisibilityTests).
        await _client.RegisterAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetThemes_ReturnsOnlyThemesSortedByName()
    {
        var activity = await CreateAsync(["cells", "Biology"], ["BIO 101"]);

        var themes = await _client.GetFromJsonAsync<List<ThemeResponse>>("/api/themes");

        Assert.Equal(activity.Themes, themes);
        Assert.Equal(["Biology", "cells"], themes!.Select(t => t.Name));
    }

    [Fact]
    public async Task GetCourses_ReturnsOnlyCoursesSortedByName()
    {
        var activity = await CreateAsync(["Biology"], ["BIO 201", "bio 101"]);

        var courses = await _client.GetFromJsonAsync<List<ThemeResponse>>("/api/courses");

        Assert.Equal(activity.Courses, courses);
        Assert.Equal(["bio 101", "BIO 201"], courses!.Select(c => c.Name));
    }

    [Fact]
    public async Task GetCourses_ReturnsEmptyListWhenThereAreNoCourses()
    {
        await CreateAsync(["Biology"], []);

        var courses = await _client.GetFromJsonAsync<List<ThemeResponse>>("/api/courses");

        Assert.Empty(courses!);
    }

    private async Task<ActivityResponse> CreateAsync(List<string?> themes, List<string?> courses)
    {
        var reading = new CreateModuleRequest("reading", JsonSerializer.SerializeToElement(new { body = "Text" }));
        var response = await _client.PostAsJsonAsync("/api/activities",
            new CreateActivityRequest("Title", null, themes, [reading], courses));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }
}
