using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Modules.MultipleChoice;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Trivia;

/// <summary>Either the saved score, or why it was refused.</summary>
public record SaveTriviaScoreResult(TriviaScoreResponse? Score, Dictionary<string, string[]> Errors);

/// <summary>
/// The trivia game asks the multiple-choice questions of the public activities only, for
/// everyone: the private activities of the signed-in user are not used.
/// </summary>
public class TriviaService(AppDbContext db)
{
    public const int MinThemes = 1;
    public const int MaxThemes = 3;

    /// <summary>The themes (topics) of the public activities that have questions, sorted by name.</summary>
    public async Task<IReadOnlyList<TriviaThemeResponse>> GetThemesAsync()
    {
        var questionsByTheme = await PublicActivities()
            .SelectMany(
                a => a.Themes.Where(t => t.Kind == ThemeKind.Topic),
                (a, t) => new
                {
                    t.Id,
                    t.Name,
                    QuestionCount = a.Modules.Count(m => m.Type == MultipleChoiceModuleType.TypeKey),
                })
            .ToListAsync();

        // An activity is counted once per theme, so the counts can be added up in memory.
        return questionsByTheme
            .GroupBy(t => (t.Id, t.Name))
            .Select(g => new TriviaThemeResponse(g.Key.Id, g.Key.Name, g.Sum(t => t.QuestionCount)))
            .Where(t => t.QuestionCount > 0)
            .OrderBy(t => t.Name, StringComparer.InvariantCultureIgnoreCase)
            .ToList();
    }

    /// <summary>
    /// The questions of the public activities that have at least one of <paramref name="themeIds"/>,
    /// each once, sorted by module id. The browser puts them in a random order.
    /// </summary>
    public async Task<IReadOnlyList<TriviaQuestionResponse>> GetQuestionsAsync(IReadOnlyCollection<int> themeIds)
    {
        var questions = await PublicActivities()
            .Where(a => a.Themes.Any(t => t.Kind == ThemeKind.Topic && themeIds.Contains(t.Id)))
            .SelectMany(
                a => a.Modules.Where(m => m.Type == MultipleChoiceModuleType.TypeKey),
                (a, m) => new { ModuleId = m.Id, ActivityId = a.Id, a.Title, m.Content })
            .OrderBy(q => q.ModuleId)
            .ToListAsync();

        return questions
            .Select(q => new TriviaQuestionResponse(
                q.ModuleId, q.ActivityId, q.Title, JsonSerializer.Deserialize<JsonElement>(q.Content)))
            .ToList();
    }

    /// <summary>
    /// Saves a finished game for <paramref name="userId"/>. The score comes from the browser; the
    /// server checks that the themes exist and that the score is not more than their number of
    /// questions, and copies the theme names.
    /// </summary>
    public async Task<SaveTriviaScoreResult> SaveScoreAsync(SaveTriviaScoreRequest request, int userId)
    {
        var errors = new Dictionary<string, string[]>();
        var themeIds = ValidateThemeIds(request.ThemeIds, errors);
        if (request.Score is null or < 0)
        {
            errors["score"] = ["The score must be a number of at least 0."];
        }
        if (errors.Count > 0)
        {
            return new SaveTriviaScoreResult(null, errors);
        }

        var themes = await db.Themes
            .AsNoTracking()
            .Where(t => t.Kind == ThemeKind.Topic && themeIds.Contains(t.Id))
            .ToListAsync();
        if (themes.Count != themeIds.Count)
        {
            return Invalid("themeIds", "A theme does not exist.");
        }

        var questionCount = await PublicActivities()
            .Where(a => a.Themes.Any(t => themeIds.Contains(t.Id)))
            .SelectMany(a => a.Modules)
            .CountAsync(m => m.Type == MultipleChoiceModuleType.TypeKey);
        if (request.Score > questionCount)
        {
            return Invalid("score", $"The score cannot be more than the {questionCount} questions of these themes.");
        }

        var score = new TriviaScore
        {
            UserId = userId,
            Score = request.Score!.Value,
            PlayedAt = DateTime.UtcNow,
            Themes = themes
                .OrderBy(t => t.Name, StringComparer.InvariantCultureIgnoreCase)
                .Select(t => new TriviaScoreTheme { ThemeId = t.Id, ThemeName = t.Name })
                .ToList(),
        };
        db.TriviaScores.Add(score);
        await db.SaveChangesAsync();
        return new SaveTriviaScoreResult(ToResponse(score), []);
    }

    /// <summary>Returns a page of the scores of <paramref name="userId"/>, newest first, and their best score.</summary>
    public async Task<TriviaScorePageResponse> GetScoresPageAsync(int userId, int page, int pageSize)
    {
        var scores = db.TriviaScores.AsNoTracking().Where(s => s.UserId == userId);

        var totalCount = await scores.CountAsync();
        var bestScore = await scores.MaxAsync(s => (int?)s.Score);
        var items = await scores
            .Include(s => s.Themes)
            .OrderByDescending(s => s.PlayedAt)
            .ThenByDescending(s => s.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new TriviaScorePageResponse(items.Select(ToResponse).ToList(), page, pageSize, totalCount, bestScore);
    }

    /// <summary>Checks the theme ids chosen for a game; adds errors keyed "themeIds".</summary>
    public static List<int> ValidateThemeIds(IReadOnlyList<int>? themeIds, Dictionary<string, string[]> errors)
    {
        var distinct = (themeIds ?? []).Distinct().ToList();
        if (distinct.Count is < MinThemes or > MaxThemes)
        {
            errors["themeIds"] = [$"Choose between {MinThemes} and {MaxThemes} themes."];
        }
        return distinct;
    }

    private static SaveTriviaScoreResult Invalid(string field, string message) =>
        new(null, new Dictionary<string, string[]> { [field] = [message] });

    private static TriviaScoreResponse ToResponse(TriviaScore score) => new(
        score.Id,
        score.Score,
        score.Themes.OrderBy(t => t.Id).Select(t => new TriviaScoreThemeResponse(t.ThemeId, t.ThemeName)).ToList(),
        // MySQL does not store the DateTime kind; all timestamps are saved in UTC.
        DateTime.SpecifyKind(score.PlayedAt, DateTimeKind.Utc));

    private IQueryable<RevisionActivity> PublicActivities() =>
        db.RevisionActivities.AsNoTracking().Where(a => a.Visibility == ActivityVisibility.Public);
}
