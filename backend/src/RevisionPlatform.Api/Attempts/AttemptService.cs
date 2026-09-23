using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Data;

namespace RevisionPlatform.Api.Attempts;

/// <summary>Either the saved attempt, or why it was refused (null activity: not found).</summary>
public record SaveAttemptResult(AttemptResponse? Attempt, Dictionary<string, string[]> Errors, bool ActivityNotFound = false);

public class AttemptService(AppDbContext db)
{
    /// <summary>A generous limit that no module type reaches, against absurd values.</summary>
    public const int MaxModuleScore = 1000;

    /// <summary>
    /// Saves a completed activity for <paramref name="userId"/>. The scores come from the browser;
    /// the server checks that the modules are exactly those of the activity, in order, copies the
    /// titles and types, and computes the global score from the graded modules.
    /// </summary>
    public async Task<SaveAttemptResult> SaveAsync(SaveAttemptRequest request, int userId)
    {
        var activity = request.ActivityId is { } activityId
            ? await db.RevisionActivities
                .AsNoTracking()
                .VisibleTo(userId)
                .Include(a => a.Modules)
                .SingleOrDefaultAsync(a => a.Id == activityId)
            : null;
        if (activity is null)
        {
            return request.ActivityId is null
                ? Invalid("activityId", "The activity is required.")
                : new SaveAttemptResult(null, [], ActivityNotFound: true);
        }

        var modules = request.Modules ?? [];
        var activityModules = activity.Modules.OrderBy(m => m.Position).ToList();
        if (modules.Count != activityModules.Count
            || modules.Where((module, index) => module?.ModuleId != activityModules[index].Id).Any())
        {
            return Invalid("modules",
                "The modules do not match the activity, which may have changed. Reload it and try again.");
        }

        var errors = new Dictionary<string, string[]>();
        for (var index = 0; index < modules.Count; index++)
        {
            ValidateModule(modules[index]!, $"modules[{index}]", errors);
        }
        if (errors.Count > 0)
        {
            return new SaveAttemptResult(null, errors);
        }

        var graded = modules.Where(m => m!.MaxScore is not null).ToList();
        var attempt = new ActivityAttempt
        {
            UserId = userId,
            ActivityId = activity.Id,
            ActivityTitle = activity.Title,
            Score = graded.Count == 0 ? null : graded.Sum(m => m!.Score!.Value),
            MaxScore = graded.Count == 0 ? null : graded.Sum(m => m!.MaxScore!.Value),
            CompletedAt = DateTime.UtcNow,
            Modules = modules
                .Select((module, index) => new AttemptModule
                {
                    ModuleId = activityModules[index].Id,
                    Position = index,
                    ModuleType = activityModules[index].Type,
                    Label = string.IsNullOrWhiteSpace(module!.Label) ? null : module.Label.Trim(),
                    Score = module.Score,
                    MaxScore = module.MaxScore,
                })
                .ToList(),
        };

        db.ActivityAttempts.Add(attempt);
        await db.SaveChangesAsync();
        return new SaveAttemptResult(ToResponse(attempt), []);
    }

    private static void ValidateModule(SaveAttemptModuleRequest module, string field, Dictionary<string, string[]> errors)
    {
        if (module.Label?.Trim().Length > AttemptModule.LabelMaxLength)
        {
            errors[$"{field}.label"] = [$"The label must be at most {AttemptModule.LabelMaxLength} characters."];
        }

        if (module.Score is null != module.MaxScore is null)
        {
            errors[$"{field}.score"] = ["The score and the maximum score must both be given, or both be missing."];
        }
        else if (module.MaxScore is { } maxScore
                 && (maxScore is < 1 or > MaxModuleScore || module.Score is < 0 || module.Score > maxScore))
        {
            errors[$"{field}.score"] =
                [$"The score must be between 0 and the maximum score, which is between 1 and {MaxModuleScore}."];
        }
    }

    private static SaveAttemptResult Invalid(string field, string message) =>
        new(null, new Dictionary<string, string[]> { [field] = [message] });

    internal static AttemptResponse ToResponse(ActivityAttempt attempt) => new(
        attempt.Id,
        attempt.ActivityId,
        attempt.ActivityTitle,
        attempt.Score,
        attempt.MaxScore,
        AsUtc(attempt.CompletedAt),
        attempt.Modules
            .OrderBy(m => m.Position)
            .Select(m => new AttemptModuleResponse(m.ModuleId, m.Position, m.ModuleType, m.Label, m.Score, m.MaxScore))
            .ToList());

    // MySQL does not store the DateTime kind; all timestamps are saved in UTC.
    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
