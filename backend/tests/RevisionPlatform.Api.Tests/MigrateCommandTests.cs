using RevisionPlatform.Api.Commands;
using RevisionPlatform.Api.Tests.Infrastructure;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class MigrateCommandTests(ApiFactory factory)
{
    [Fact]
    public async Task Migrate_ReportsAnUpToDateDatabase()
    {
        // The factory has already applied every migration to the test database.
        var output = new StringWriter();

        var exitCode = await MigrateCommand.RunAsync(factory.Services, [], output);

        Assert.Equal(0, exitCode);
        Assert.Contains("The database is up to date.", output.ToString());
    }

    [Fact]
    public async Task Migrate_RejectsArguments()
    {
        var output = new StringWriter();

        var exitCode = await MigrateCommand.RunAsync(factory.Services, ["extra"], output);

        Assert.Equal(1, exitCode);
        Assert.Contains("Usage: migrate", output.ToString());
    }

    [Fact]
    public void Migrate_IsACommand()
    {
        Assert.True(CommandRunner.IsCommand(["migrate"]));
    }
}
