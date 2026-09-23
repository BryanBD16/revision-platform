using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Tests.Infrastructure;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class ActivityListEndpointTests(ApiFactory factory) : IAsyncLifetime
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
    public async Task GetPage_UsesTheFirstPageOfTwentyByDefault()
    {
        await CreateManyAsync(21);

        var page = await GetPageAsync("");

        Assert.Equal(1, page.Page);
        Assert.Equal(20, page.PageSize);
        Assert.Equal(21, page.TotalCount);
        Assert.Equal(20, page.Items.Count);
        Assert.Equal("Activity 21", page.Items[0].Title);
    }

    [Fact]
    public async Task GetPage_ReturnsTheRequestedPageNewestFirst()
    {
        await CreateManyAsync(5);

        var second = await GetPageAsync("?page=2&pageSize=2");
        var last = await GetPageAsync("?page=3&pageSize=2");

        Assert.Equal(["Activity 3", "Activity 2"], second.Items.Select(a => a.Title));
        Assert.Equal(["Activity 1"], last.Items.Select(a => a.Title));
        Assert.Equal(5, last.TotalCount);
    }

    [Fact]
    public async Task GetPage_ReturnsNoItemsAfterTheLastPage()
    {
        await CreateManyAsync(2);

        var page = await GetPageAsync("?page=3&pageSize=2");

        Assert.Empty(page.Items);
        Assert.Equal(2, page.TotalCount);
    }

    [Fact]
    public async Task GetPage_AcceptsTheMaximumPageSize()
    {
        var page = await GetPageAsync("?pageSize=100");

        Assert.Equal(100, page.PageSize);
    }

    [Theory]
    [InlineData("?page=0", "page")]
    [InlineData("?page=-1", "page")]
    [InlineData("?page=2147483647", "page")]
    [InlineData("?pageSize=0", "pageSize")]
    [InlineData("?pageSize=101", "pageSize")]
    [InlineData("?page=abc", "page")]
    [InlineData("?courseId=abc", "courseId")]
    public async Task GetPage_RejectsInvalidPagination(string query, string invalidParameter)
    {
        var response = await _client.GetAsync($"/api/activities{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal([invalidParameter], problem!.Errors.Keys);
    }

    [Fact]
    public async Task GetPage_FiltersByTitleIgnoringCaseAndAccents()
    {
        await CreateAsync("Cell division", ["Biology"]);
        await CreateAsync("Mitosis and the CELL cycle", ["Biology"]);
        await CreateAsync("Élèves et mitochondries", ["Biology"]);
        await CreateAsync("Photosynthesis", ["Biology"]);

        Assert.Equal(["Mitosis and the CELL cycle", "Cell division"], await GetTitlesAsync("?title=%20cell%20"));
        Assert.Equal(["Élèves et mitochondries"], await GetTitlesAsync("?title=eleves"));
    }

    [Fact]
    public async Task GetPage_FiltersByASingleLetterAnywhereInTheTitle()
    {
        await CreateAsync("How cells divide", ["Biology"]);
        await CreateAsync("Photosynthesis", ["Biology"]);
        await CreateAsync("The genome", ["Biology"]);
        await CreateAsync("Enzymes", ["Biology"]);
        await CreateAsync("Mitosis", ["Biology"]);

        Assert.Equal(["The genome", "Photosynthesis", "How cells divide"], await GetTitlesAsync("?title=h"));
        Assert.Equal(["Enzymes"], await GetTitlesAsync("?title=z"));
        Assert.Empty(await GetTitlesAsync("?title=q"));
    }

    [Fact]
    public async Task GetPage_TreatsWildcardCharactersInTitleAsText()
    {
        await CreateAsync("100% cells", ["Biology"]);
        await CreateAsync("100 cells", ["Biology"]);
        await CreateAsync("snake_case", ["Biology"]);
        await CreateAsync("snakeXcase", ["Biology"]);

        Assert.Equal(["100% cells"], await GetTitlesAsync("?title=100%25"));
        Assert.Equal(["snake_case"], await GetTitlesAsync("?title=snake_"));
    }

    [Fact]
    public async Task GetPage_IgnoresBlankTitle()
    {
        await CreateManyAsync(2);

        Assert.Equal(2, (await GetPageAsync("?title=%20%20")).TotalCount);
    }

    [Fact]
    public async Task GetPage_FiltersByCourse()
    {
        var first = await CreateAsync("First", ["Biology"], ["BIO 101"]);
        await CreateAsync("Second", ["Biology"], ["BIO 101", "BIO 201"]);
        await CreateAsync("Third", ["Biology"], ["BIO 201"]);
        await CreateAsync("Fourth", ["Biology"]);

        Assert.Equal(["Second", "First"], await GetTitlesAsync($"?courseId={CourseId(first, "BIO 101")}"));
    }

    [Fact]
    public async Task GetPage_RequiresAllSelectedThemes()
    {
        var first = await CreateAsync("Both", ["Biology", "Cells"]);
        await CreateAsync("Biology only", ["Biology"]);
        await CreateAsync("Cells only", ["Cells"]);
        var biology = ThemeId(first, "Biology");
        var cells = ThemeId(first, "Cells");

        Assert.Equal(["Biology only", "Both"], await GetTitlesAsync($"?themeIds={biology}"));
        Assert.Equal(["Both"], await GetTitlesAsync($"?themeIds={biology}&themeIds={cells}"));
    }

    [Fact]
    public async Task GetPage_KeepsCoursesAndThemesSeparate()
    {
        var activity = await CreateAsync("Title", ["Biology"], ["Biology"]);

        Assert.Empty(await GetTitlesAsync($"?courseId={ThemeId(activity, "Biology")}"));
        Assert.Empty(await GetTitlesAsync($"?themeIds={CourseId(activity, "Biology")}"));
    }

    [Fact]
    public async Task GetPage_RequiresEveryFilter()
    {
        var match = await CreateAsync("Cell division", ["Biology", "Cells"], ["BIO 101"]);
        await CreateAsync("Cell division", ["Biology", "Cells"], ["BIO 201"]);
        await CreateAsync("Cell division", ["Biology"], ["BIO 101"]);
        await CreateAsync("Photosynthesis", ["Biology", "Cells"], ["BIO 101"]);

        var page = await GetPageAsync(
            $"?title=cell&courseId={CourseId(match, "BIO 101")}&themeIds={ThemeId(match, "Cells")}");

        Assert.Equal(match.Id, Assert.Single(page.Items).Id);
        Assert.Equal(1, page.TotalCount);
    }

    [Fact]
    public async Task GetPage_CountsOnlyMatchingActivities()
    {
        var first = await CreateAsync("Cells 1", ["Cells"]);
        await CreateAsync("Cells 2", ["Cells"]);
        await CreateAsync("Cells 3", ["Cells"]);
        await CreateAsync("Other", ["Biology"]);

        var page = await GetPageAsync($"?themeIds={ThemeId(first, "Cells")}&page=2&pageSize=2");

        Assert.Equal(["Cells 1"], page.Items.Select(a => a.Title));
        Assert.Equal(3, page.TotalCount);
    }

    [Fact]
    public async Task GetPage_ReturnsNothingForUnknownIds()
    {
        await CreateManyAsync(1);

        Assert.Empty(await GetTitlesAsync("?courseId=999999"));
        Assert.Empty(await GetTitlesAsync("?themeIds=999999"));
    }

    [Fact]
    public async Task GetPage_RejectsTooLongTitle()
    {
        var response = await _client.GetAsync($"/api/activities?title={new string('a', 201)}");

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(["title"], problem!.Errors.Keys);
    }

    [Fact]
    public async Task GetPage_RejectsTooManyThemes()
    {
        var query = string.Join("&", Enumerable.Range(1, 21).Select(id => $"themeIds={id}"));

        var response = await _client.GetAsync($"/api/activities?{query}");

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(["themeIds"], problem!.Errors.Keys);
    }

    private async Task<ActivityPageResponse> GetPageAsync(string query)
    {
        var page = await _client.GetFromJsonAsync<ActivityPageResponse>($"/api/activities{query}");
        return page!;
    }

    /// <summary>Creates "Activity 1" to "Activity {count}", in that order.</summary>
    private async Task CreateManyAsync(int count)
    {
        for (var number = 1; number <= count; number++)
        {
            await CreateAsync($"Activity {number}", ["Biology"]);
        }
    }

    private async Task<ActivityResponse> CreateAsync(string title, List<string?> themes, List<string?>? courses = null)
    {
        var reading = new CreateModuleRequest("reading", JsonSerializer.SerializeToElement(new { body = "Text" }));
        var response = await _client.PostAsJsonAsync("/api/activities",
            new CreateActivityRequest(title, null, themes, [reading], courses));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }

    private async Task<List<string>> GetTitlesAsync(string query)
    {
        var page = await GetPageAsync(query);
        return page.Items.Select(a => a.Title).ToList();
    }

    private static int ThemeId(ActivityResponse activity, string name) =>
        activity.Themes.Single(t => t.Name == name).Id;

    private static int CourseId(ActivityResponse activity, string name) =>
        activity.Courses.Single(c => c.Name == name).Id;
}
