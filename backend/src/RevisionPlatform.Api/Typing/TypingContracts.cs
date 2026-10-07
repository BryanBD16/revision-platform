namespace RevisionPlatform.Api.Typing;

// Request properties are nullable so that missing values reach TypingService
// instead of being rejected by the framework with a different error format.

/// <summary>A finished typing test, with the speeds computed by the browser.</summary>
public record SaveTypingResultRequest(string? Mode, int? DurationSeconds, int? AverageWpm, int? PeakWpm);

public record TypingResultResponse(
    int Id,
    string Mode,
    int? DurationSeconds,
    int AverageWpm,
    int PeakWpm,
    DateTime PlayedAt);

/// <summary>A page of typing results, newest first.</summary>
public record TypingResultPageResponse(
    IReadOnlyList<TypingResultResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
