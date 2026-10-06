using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Modules.MultipleChoice;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Trivia;

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

    private IQueryable<RevisionActivity> PublicActivities() =>
        db.RevisionActivities.AsNoTracking().Where(a => a.Visibility == ActivityVisibility.Public);
}
