namespace RevisionPlatform.Api.Modules.MultipleChoice;

/// <summary>
/// Content of a multiple-choice module: a question, its choices, the ids of the
/// correct choices (one or more) and an optional explanation shown after answering.
/// </summary>
public record MultipleChoiceContent(
    string? Question,
    List<Choice?>? Choices,
    List<string?>? CorrectChoiceIds,
    string? Explanation);

/// <summary>A possible answer. <see cref="Id"/> is unique within the question.</summary>
public record Choice(string? Id, string? Text);
