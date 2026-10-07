using System.Text.Json;

namespace RevisionPlatform.Api.Trivia;

/// <summary>A theme that the trivia game can ask about, with the number of questions it has.</summary>
public record TriviaThemeResponse(int Id, string Name, int QuestionCount);

/// <summary>
/// A multiple-choice module of a public activity, with its content (correct answers included:
/// the browser grades the answers).
/// </summary>
public record TriviaQuestionResponse(int ModuleId, int ActivityId, string ActivityTitle, JsonElement Content);

/// <summary>The number of questions of some themes, each counted once.</summary>
public record TriviaQuestionCountResponse(int QuestionCount);

// Request properties are nullable so that missing values reach TriviaService
// instead of being rejected by the framework with a different error format.

/// <summary>A finished game: the number of correct answers in a row, computed by the browser.</summary>
public record SaveTriviaScoreRequest(int? Score, List<int>? ThemeIds);

/// <summary>A theme of a score. <c>Id</c> is null once the theme is deleted.</summary>
public record TriviaScoreThemeResponse(int? Id, string Name);

public record TriviaScoreResponse(int Id, int Score, IReadOnlyList<TriviaScoreThemeResponse> Themes, DateTime PlayedAt);

/// <summary>A page of scores, newest first, with the best score of all pages (null without scores).</summary>
public record TriviaScorePageResponse(
    IReadOnlyList<TriviaScoreResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int? BestScore);
