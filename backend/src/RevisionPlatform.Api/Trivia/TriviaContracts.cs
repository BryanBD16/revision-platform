using System.Text.Json;

namespace RevisionPlatform.Api.Trivia;

/// <summary>A theme that the trivia game can ask about, with the number of questions it has.</summary>
public record TriviaThemeResponse(int Id, string Name, int QuestionCount);

/// <summary>
/// A multiple-choice module of a public activity, with its content (correct answers included:
/// the browser grades the answers).
/// </summary>
public record TriviaQuestionResponse(int ModuleId, int ActivityId, string ActivityTitle, JsonElement Content);
