using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Tests.Infrastructure;
using RevisionPlatform.Api.Trivia;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class TriviaEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _admin = factory.CreateApiClient();
    private readonly HttpClient _ada = factory.CreateApiClient();
    private readonly HttpClient _visitor = factory.CreateApiClient();

    public async Task InitializeAsync()
    {
        await factory.ResetDatabaseAsync();
        await _admin.RegisterAdminAsync(factory);
        await _ada.RegisterAsync("ada@example.com", "Ada");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetThemes_CountsTheQuestionsOfThePublicActivitiesByTheme()
    {
        await CreatePublicAsync("Cells", ["Biology", "Cells"], [Question("Q1"), Reading(), Question("Q2")]);
        await CreatePublicAsync("Plants", ["biology"], [Question("Q3")]);
        await CreatePublicAsync("Reading only", ["History"], [Reading()]);
        await CreateAsync(_ada, "Mine", ["Biology", "Chemistry"], [Question("Q4")], ActivityVisibility.Private);

        var themes = await _visitor.GetFromJsonAsync<List<TriviaThemeResponse>>("/api/trivia/themes");

        Assert.Equal([("Biology", 3), ("Cells", 2)], themes!.Select(t => (t.Name, t.QuestionCount)));
    }

    [Fact]
    public async Task GetThemes_DoesNotListTheCourses()
    {
        await CreatePublicAsync("Cells", ["Biology"], [Question("Q1")], courses: ["BIO 101"]);

        var themes = await _visitor.GetFromJsonAsync<List<TriviaThemeResponse>>("/api/trivia/themes");

        Assert.Equal(["Biology"], themes!.Select(t => t.Name));
    }

    [Fact]
    public async Task GetQuestions_ReturnsTheQuestionsOfTheActivitiesWithAnyOfTheThemes()
    {
        var cells = await CreatePublicAsync("Cells", ["Biology", "Cells"], [Question("Q1"), Reading(), Question("Q2")]);
        var atoms = await CreatePublicAsync("Atoms", ["Chemistry"], [Question("Q3")]);
        await CreatePublicAsync("Wars", ["History"], [Question("Q4")]);
        var biology = ThemeId(cells, "Biology");
        var chemistry = ThemeId(atoms, "Chemistry");

        var questions = await _visitor.GetFromJsonAsync<List<TriviaQuestionResponse>>(
            $"/api/trivia/questions?themeIds={biology}&themeIds={ThemeId(cells, "Cells")}&themeIds={chemistry}");

        // A question of an activity with two of the themes is returned once.
        Assert.Equal(["Q1", "Q2", "Q3"], questions!.Select(q => q.Content.GetProperty("question").GetString()));
        Assert.Equal(
            [(cells.Modules[0].Id, cells.Id, "Cells"), (cells.Modules[2].Id, cells.Id, "Cells"), (atoms.Modules[0].Id, atoms.Id, "Atoms")],
            questions!.Select(q => (q.ModuleId, q.ActivityId, q.ActivityTitle)));
        Assert.Equal(["a"], questions[0].Content.GetProperty("correctChoiceIds").EnumerateArray().Select(id => id.GetString()));
    }

    [Fact]
    public async Task GetQuestions_IgnoresThePrivateActivitiesOfTheSignedInUser()
    {
        var mine = await CreateAsync(_ada, "Mine", ["Biology"], [Question("Private")], ActivityVisibility.Private);
        await CreatePublicAsync("Cells", ["Biology"], [Question("Public")]);

        var questions = await _ada.GetFromJsonAsync<List<TriviaQuestionResponse>>(
            $"/api/trivia/questions?themeIds={ThemeId(mine, "Biology")}");

        Assert.Equal(["Public"], questions!.Select(q => q.Content.GetProperty("question").GetString()));
    }

    [Fact]
    public async Task GetQuestions_DoesNotUseTheCourses()
    {
        var activity = await CreatePublicAsync("Cells", ["Biology"], [Question("Q1")], courses: ["BIO 101"]);

        var questions = await _visitor.GetFromJsonAsync<List<TriviaQuestionResponse>>(
            $"/api/trivia/questions?themeIds={activity.Courses[0].Id}");

        Assert.Empty(questions!);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?themeIds=1&themeIds=2&themeIds=3&themeIds=4")]
    public async Task GetQuestions_RequiresOneToThreeThemes(string query)
    {
        var response = await _visitor.GetAsync($"/api/trivia/questions{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("themeIds", problem!.Errors.Keys);
    }

    [Fact]
    public async Task GetQuestions_CountsARepeatedThemeOnce()
    {
        var response = await _visitor.GetAsync("/api/trivia/questions?themeIds=1&themeIds=1&themeIds=1&themeIds=1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static int ThemeId(ActivityResponse activity, string name) =>
        activity.Themes.Single(t => t.Name == name).Id;

    private Task<ActivityResponse> CreatePublicAsync(
        string title, List<string?> themes, List<SaveModuleRequest?> modules, List<string?>? courses = null) =>
        CreateAsync(_admin, title, themes, modules, ActivityVisibility.Public, courses);

    private static async Task<ActivityResponse> CreateAsync(
        HttpClient client, string title, List<string?> themes, List<SaveModuleRequest?> modules, string visibility,
        List<string?>? courses = null)
    {
        var response = await client.PostAsJsonAsync("/api/activities",
            new SaveActivityRequest(title, null, themes, modules, courses, visibility));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ActivityResponse>())!;
    }

    private static SaveModuleRequest Reading() =>
        new("reading", JsonSerializer.SerializeToElement(new { body = "Text" }));

    private static SaveModuleRequest Question(string question) =>
        new("multiple-choice", JsonSerializer.SerializeToElement(new
        {
            question,
            choices = new[] { new { id = "a", text = "Right" }, new { id = "b", text = "Wrong" } },
            correctChoiceIds = new[] { "a" },
        }));
}
