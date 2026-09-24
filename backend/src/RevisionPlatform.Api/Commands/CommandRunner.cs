namespace RevisionPlatform.Api.Commands;

/// <summary>
/// The commands that the backend runs instead of the web server, for example
/// <c>dotnet run -- users list</c>. They are for people with access to the server
/// and are never exposed over HTTP.
/// </summary>
public static class CommandRunner
{
    public static bool IsCommand(string[] args) => args is [UserCommands.Name or SeedCommand.Name or MigrateCommand.Name, ..];

    /// <summary>Runs the command and returns the process exit code (0 when it succeeded).</summary>
    public static Task<int> RunAsync(IServiceProvider services, string[] args) => args[0] switch
    {
        UserCommands.Name => UserCommands.RunAsync(services, args[1..], Console.In, Console.Out),
        MigrateCommand.Name => MigrateCommand.RunAsync(services, args[1..], Console.Out),
        _ => SeedCommand.RunAsync(services, args[1..], Console.Out),
    };
}
