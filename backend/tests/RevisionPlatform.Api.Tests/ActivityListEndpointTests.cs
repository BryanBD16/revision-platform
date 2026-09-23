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
    private readonly HttpClient _client = factory.CreateClient();

    public Task InitializeAsync() => factory.ResetDatabaseAsync();

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
    public async Task GetPage_RejectsInvalidPagination(string query, string invalidParameter)
    {
        var response = await _client.GetAsync($"/api/activities{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal([invalidParameter], problem!.Errors.Keys);
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

    private async Task CreateAsync(string title, List<string?> themes, List<string?>? courses = null)
    {
        var reading = new CreateModuleRequest("reading", JsonSerializer.SerializeToElement(new { body = "Text" }));
        var response = await _client.PostAsJsonAsync("/api/activities",
            new CreateActivityRequest(title, null, themes, [reading], courses));
        response.EnsureSuccessStatusCode();
    }
}
