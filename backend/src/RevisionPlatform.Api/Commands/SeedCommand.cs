using System.Text.Json;
using RevisionPlatform.Api.Activities;

namespace RevisionPlatform.Api.Commands;

/// <summary>
/// Creates the activities described by the JSON files of a directory (see seed/activities),
/// run with <c>dotnet run -- seed &lt;directory&gt;</c>. Each file is a request body for
/// POST /api/activities. All the files are validated before any activity is created.
/// </summary>
public static class SeedCommand
{
    public const string Name = "seed";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static async Task<int> RunAsync(IServiceProvider services, string[] args, TextWriter output)
    {
        if (args is not [var directory])
        {
            output.WriteLine("Usage: seed <directory>");
            return 1;
        }
        if (!Directory.Exists(directory))
        {
            output.WriteLine($"Error: the directory '{directory}' does not exist.");
            return 1;
        }

        using var scope = services.CreateScope();
        var validator = scope.ServiceProvider.GetRequiredService<ActivityValidator>();
        var activityService = scope.ServiceProvider.GetRequiredService<ActivityService>();

        var activities = new List<(string File, ValidatedActivity Activity)>();
        var valid = true;
        foreach (var file in Directory.GetFiles(directory, "*.json").Order())
        {
            var errors = Validate(file, validator, out var activity);
            if (activity is null)
            {
                valid = false;
                output.WriteLine($"{Path.GetFileName(file)}: invalid");
                foreach (var (field, messages) in errors)
                {
                    output.WriteLine($"  {field}: {string.Join(" ", messages)}");
                }
                continue;
            }
            activities.Add((file, activity));
        }

        if (!valid)
        {
            output.WriteLine("Nothing was created.");
            return 1;
        }

        foreach (var (file, activity) in activities)
        {
            // Seed activities are shared with everyone: public, without an owner.
            await activityService.CreateAsync(activity with { Visibility = ActivityVisibility.Public }, ownerId: null);
            output.WriteLine($"{Path.GetFileName(file)}: created");
        }
        return 0;
    }

    private static Dictionary<string, string[]> Validate(
        string file, ActivityValidator validator, out ValidatedActivity? activity)
    {
        activity = null;
        CreateActivityRequest? request;
        try
        {
            request = JsonSerializer.Deserialize<CreateActivityRequest>(File.ReadAllText(file), JsonOptions);
        }
        catch (JsonException exception)
        {
            return new Dictionary<string, string[]> { ["json"] = [exception.Message] };
        }
        if (request is null)
        {
            return new Dictionary<string, string[]> { ["json"] = ["The file is empty."] };
        }

        var result = validator.Validate(request);
        activity = result.Activity;
        return result.Errors;
    }
}
