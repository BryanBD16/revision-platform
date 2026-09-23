using System.Net.Http.Json;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Commands;
using RevisionPlatform.Api.Tests.Infrastructure;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class SeedCommandTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly string _directory = Directory.CreateTempSubdirectory("seed-test-").FullName;

    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync()
    {
        Directory.Delete(_directory, recursive: true);
        return Task.CompletedTask;
    }

    private const string Valid = """
        { "title": "Cells", "themes": ["Biology"], "courses": ["BIO 101"],
          "modules": [{ "type": "reading", "content": { "body": "Text" } }] }
        """;

    [Fact]
    public async Task Seed_CreatesTheActivitiesOfEachFile()
    {
        File.WriteAllText(Path.Combine(_directory, "01.json"), Valid);
        File.WriteAllText(Path.Combine(_directory, "02.json"), Valid.Replace("Cells", "Mitosis"));

        var (exitCode, output) = await RunAsync(_directory);

        Assert.Equal(0, exitCode);
        Assert.Contains("01.json: created", output);
        Assert.Equal(["Mitosis", "Cells"], await TitlesAsync());
    }

    [Fact]
    public async Task Seed_CreatesNothingWhenAFileIsInvalid()
    {
        File.WriteAllText(Path.Combine(_directory, "01.json"), Valid);
        File.WriteAllText(Path.Combine(_directory, "02.json"), Valid.Replace("\"Cells\"", "\"  \""));
        File.WriteAllText(Path.Combine(_directory, "03.json"), "{ not json");

        var (exitCode, output) = await RunAsync(_directory);

        Assert.Equal(1, exitCode);
        Assert.Contains("02.json: invalid", output);
        Assert.Contains("title: The title is required.", output);
        Assert.Contains("03.json: invalid", output);
        Assert.Contains("Nothing was created.", output);
        Assert.Empty(await TitlesAsync());
    }

    [Fact]
    public async Task Seed_CreatesOnlyTheFilesMatchingThePattern()
    {
        File.WriteAllText(Path.Combine(_directory, "01-project.json"), Valid);
        File.WriteAllText(Path.Combine(_directory, "csharp-1.json"), Valid.Replace("Cells", "C# basics"));

        var output = new StringWriter();
        var exitCode = await SeedCommand.RunAsync(factory.Services, [_directory, "csharp-*.json"], output);

        Assert.Equal(0, exitCode);
        Assert.Equal(["C# basics"], await TitlesAsync());
    }

    [Fact]
    public async Task Seed_ReportsAPatternMatchingNoFile()
    {
        File.WriteAllText(Path.Combine(_directory, "01.json"), Valid);

        var output = new StringWriter();
        var exitCode = await SeedCommand.RunAsync(factory.Services, [_directory, "python-*.json"], output);

        Assert.Equal(1, exitCode);
        Assert.Contains("matches 'python-*.json'", output.ToString());
        Assert.Empty(await TitlesAsync());
    }

    [Fact]
    public async Task Seed_ReportsAMissingDirectory()
    {
        var (exitCode, output) = await RunAsync(Path.Combine(_directory, "missing"));

        Assert.Equal(1, exitCode);
        Assert.Contains("does not exist", output);
    }

    /// <summary>The seed files of the repository must stay valid when the API rules change.</summary>
    [Fact]
    public async Task Seed_AcceptsTheSeedFilesOfTheRepository()
    {
        var directory = FindRepositorySeedDirectory();

        var (exitCode, output) = await RunAsync(directory);

        Assert.True(exitCode == 0, output);
        Assert.Equal(Directory.GetFiles(directory, "*.json").Length, (await TitlesAsync()).Count);
    }

    private async Task<(int ExitCode, string Output)> RunAsync(string directory)
    {
        var output = new StringWriter();
        var exitCode = await SeedCommand.RunAsync(factory.Services, [directory], output);
        return (exitCode, output.ToString());
    }

    private async Task<List<string>> TitlesAsync()
    {
        var page = await factory.CreateApiClient().GetFromJsonAsync<ActivityPageResponse>("/api/activities");
        return page!.Items.Select(a => a.Title).ToList();
    }

    private static string FindRepositorySeedDirectory()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
        {
            var seed = Path.Combine(directory.FullName, "seed", "activities");
            if (Directory.Exists(seed))
            {
                return seed;
            }
        }
        throw new InvalidOperationException("The seed/activities directory was not found.");
    }
}
