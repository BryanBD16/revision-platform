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

    [Fact]
    public async Task CountQuestions_CountsEachPublicQuestionOfTheThemesOnce()
    {
        var cells = await CreatePublicAsync("Cells", ["Biology", "Cells"], [Question("Q1"), Reading(), Question("Q2")]);
        var atoms = await CreatePublicAsync("Atoms", ["Chemistry"], [Question("Q3")]);
        await CreatePublicAsync("Wars", ["History"], [Question("Q4")]);
        await CreateAsync(_ada, "Mine", ["Biology"], [Question("Private")], ActivityVisibility.Private);

        var count = await _visitor.GetFromJsonAsync<TriviaQuestionCountResponse>(
            $"/api/trivia/questions/count?themeIds={ThemeId(cells, "Biology")}&themeIds={ThemeId(cells, "Cells")}&themeIds={ThemeId(atoms, "Chemistry")}");

        // The questions of an activity with two of the themes are counted once.
        Assert.Equal(3, count!.QuestionCount);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?themeIds=1&themeIds=2&themeIds=3&themeIds=4")]
    public async Task CountQuestions_RequiresOneToThreeThemes(string query)
    {
        var response = await _visitor.GetAsync($"/api/trivia/questions/count{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("themeIds", problem!.Errors.Keys);
    }

    [Fact]
    public async Task SaveScore_StoresTheScoreWithACopyOfTheThemeNames()
    {
        var cells = await CreatePublicAsync("Cells", ["Cells", "Biology"], [Question("Q1"), Question("Q2")]);

        var response = await _ada.PostAsJsonAsync("/api/trivia/scores",
            new SaveTriviaScoreRequest(2, [ThemeId(cells, "Cells"), ThemeId(cells, "Biology")]));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var score = (await response.Content.ReadFromJsonAsync<TriviaScoreResponse>())!;
        Assert.Equal(2, score.Score);
        Assert.Equal(["Biology", "Cells"], score.Themes.Select(t => t.Name));
        Assert.Equal([ThemeId(cells, "Biology"), ThemeId(cells, "Cells")], score.Themes.Select(t => t.Id!.Value));
        Assert.InRange(score.PlayedAt, DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow.AddMinutes(1));
    }

    [Fact]
    public async Task SaveScore_AcceptsAScoreOfZero()
    {
        var cells = await CreatePublicAsync("Cells", ["Biology"], [Question("Q1")]);

        var response = await _ada.PostAsJsonAsync("/api/trivia/scores",
            new SaveTriviaScoreRequest(0, [ThemeId(cells, "Biology")]));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task SaveScore_RequiresASignedInUser()
    {
        var cells = await CreatePublicAsync("Cells", ["Biology"], [Question("Q1")]);

        var response = await _visitor.PostAsJsonAsync("/api/trivia/scores",
            new SaveTriviaScoreRequest(1, [ThemeId(cells, "Biology")]));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    public static TheoryData<string, string> InvalidScores => new()
    {
        { """{ "themeIds": [BIOLOGY] }""", "score" },
        { """{ "score": -1, "themeIds": [BIOLOGY] }""", "score" },
        // Biology has two public questions; the private one does not count.
        { """{ "score": 3, "themeIds": [BIOLOGY] }""", "score" },
        { """{ "score": 1, "themeIds": [] }""", "themeIds" },
        { """{ "score": 1 }""", "themeIds" },
        { """{ "score": 1, "themeIds": [BIOLOGY, 1000001, 1000002, 1000003] }""", "themeIds" },
        { """{ "score": 1, "themeIds": [1000001] }""", "themeIds" },
        { """{ "score": 1, "themeIds": [COURSE] }""", "themeIds" },
    };

    [Theory]
    [MemberData(nameof(InvalidScores))]
    public async Task SaveScore_RejectsAnInvalidScore(string json, string field)
    {
        var cells = await CreatePublicAsync("Cells", ["Biology"], [Question("Q1"), Question("Q2")], courses: ["BIO 101"]);
        await CreateAsync(_ada, "Mine", ["Biology"], [Question("Private")], ActivityVisibility.Private);
        json = json.Replace("BIOLOGY", ThemeId(cells, "Biology").ToString())
            .Replace("COURSE", cells.Courses[0].Id.ToString());

        var response = await _ada.PostAsync("/api/trivia/scores",
            new StringContent(json, System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
    }

    [Fact]
    public async Task GetScores_ReturnsTheUserScoresNewestFirstWithTheBestOne()
    {
        var cells = await CreatePublicAsync("Cells", ["Biology"], [Question("Q1"), Question("Q2"), Question("Q3")]);
        var biology = ThemeId(cells, "Biology");
        await SaveScoreAsync(_ada, 1, biology);
        await SaveScoreAsync(_ada, 3, biology);
        await SaveScoreAsync(_ada, 2, biology);
        var bob = factory.CreateApiClient();
        await bob.RegisterAsync("bob@example.com", "Bob");
        await SaveScoreAsync(bob, 0, biology);

        var page = await _ada.GetFromJsonAsync<TriviaScorePageResponse>("/api/trivia/scores?pageSize=2");

        Assert.Equal([2, 3], page!.Items.Select(s => s.Score));
        Assert.Equal((1, 2, 3, 3), (page.Page, page.PageSize, page.TotalCount, page.BestScore));
        Assert.Equal(["Biology"], page.Items[0].Themes.Select(t => t.Name));
    }

    [Fact]
    public async Task GetScores_HasNoBestScoreWithoutScores()
    {
        var page = await _ada.GetFromJsonAsync<TriviaScorePageResponse>("/api/trivia/scores");

        Assert.Empty(page!.Items);
        Assert.Null(page.BestScore);
    }

    [Fact]
    public async Task GetScores_RequiresASignedInUser()
    {
        var response = await _visitor.GetAsync("/api/trivia/scores");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static async Task SaveScoreAsync(HttpClient client, int score, int themeId)
    {
        var response = await client.PostAsJsonAsync("/api/trivia/scores", new SaveTriviaScoreRequest(score, [themeId]));
        response.EnsureSuccessStatusCode();
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
