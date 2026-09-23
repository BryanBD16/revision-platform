using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RevisionPlatform.Api.Activities;
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

    private static SaveActivityRequest Request(string title, string? visibility = null) =>
        new(title, null, ["Biology"], [Reading("Text")], null, visibility);

    private static SaveModuleRequest Reading(string body) =>
        new("reading", JsonSerializer.SerializeToElement(new { body }));

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
