namespace RevisionPlatform.Api.Modules.Matching;

/// <summary>
/// Content of a matching module: pairs of a concept and its definition. Learners
/// match each concept with a definition; optional instructions are shown above.
/// </summary>
public record MatchingContent(string? Instructions, List<MatchingPair?>? Pairs);

/// <summary>A concept and its definition. <see cref="Id"/> is unique within the module.</summary>
public record MatchingPair(string? Id, string? Concept, string? Definition);
