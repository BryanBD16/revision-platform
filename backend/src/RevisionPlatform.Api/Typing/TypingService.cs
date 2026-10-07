using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Data;

namespace RevisionPlatform.Api.Typing;

/// <summary>Either the saved result, or why it was refused.</summary>
public record SaveTypingResultResult(TypingResultResponse? Result, Dictionary<string, string[]> Errors);

/// <summary>
/// The results of the typing tests. The test itself runs in the browser, independently of
/// the revision activities; only the results of signed-in users are saved.
/// </summary>
public class TypingService(AppDbContext db)
{
    /// <summary>Above the typing world records: a higher speed cannot come from a real test.</summary>
    public const int MaxWpm = 300;

    /// <summary>
    /// Saves a finished test for <paramref name="userId"/>. The speeds come from the browser;
    /// the server only checks that they are plausible.
    /// </summary>
    public async Task<SaveTypingResultResult> SaveResultAsync(SaveTypingResultRequest request, int userId)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Mode != TypingModes.Timed)
        {
            errors["mode"] = [$"The mode must be \"{TypingModes.Timed}\"."];
        }
        else if (request.DurationSeconds is not { } duration || !TypingModes.TimedDurationsSeconds.Contains(duration))
        {
            errors["durationSeconds"] =
                [$"A timed test lasts {string.Join(", ", TypingModes.TimedDurationsSeconds)} seconds."];
        }
        if (request.AverageWpm is null or < 0 or > MaxWpm)
        {
            errors["averageWpm"] = [$"The average speed must be between 0 and {MaxWpm} words per minute."];
        }
        if (request.PeakWpm is null or < 0 or > MaxWpm)
        {
            errors["peakWpm"] = [$"The highest speed must be between 0 and {MaxWpm} words per minute."];
        }
        else if (request.PeakWpm < request.AverageWpm)
        {
            errors["peakWpm"] = ["The highest speed cannot be lower than the average speed."];
        }
        if (errors.Count > 0)
        {
            return new SaveTypingResultResult(null, errors);
        }

        var result = new TypingResult
        {
            UserId = userId,
            Mode = request.Mode!,
            DurationSeconds = request.DurationSeconds,
            AverageWpm = request.AverageWpm!.Value,
            PeakWpm = request.PeakWpm!.Value,
            PlayedAt = DateTime.UtcNow,
        };
        db.TypingResults.Add(result);
        await db.SaveChangesAsync();
        return new SaveTypingResultResult(ToResponse(result), []);
    }

    /// <summary>Returns a page of the results of <paramref name="userId"/>, newest first.</summary>
    public async Task<TypingResultPageResponse> GetResultsPageAsync(int userId, int page, int pageSize)
    {
        var results = db.TypingResults.AsNoTracking().Where(r => r.UserId == userId);

        var totalCount = await results.CountAsync();
        var items = await results
            .OrderByDescending(r => r.PlayedAt)
            .ThenByDescending(r => r.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new TypingResultPageResponse(items.Select(ToResponse).ToList(), page, pageSize, totalCount);
    }

    private static TypingResultResponse ToResponse(TypingResult result) => new(
        result.Id,
        result.Mode,
        result.DurationSeconds,
        result.AverageWpm,
        result.PeakWpm,
        // MySQL does not store the DateTime kind; all timestamps are saved in UTC.
        DateTime.SpecifyKind(result.PlayedAt, DateTimeKind.Utc));
}
