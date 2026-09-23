namespace RevisionPlatform.Api.Attempts;

// Request properties are nullable so that missing values reach AttemptService
// instead of being rejected by the framework with a different error format.

/// <summary>A completed activity: the result of each of its modules, in the order of the activity.</summary>
public record SaveAttemptRequest(int? ActivityId, List<SaveAttemptModuleRequest?>? Modules);

/// <summary>
/// The result of a module, computed by the browser. <c>Score</c> and <c>MaxScore</c> are both
/// null for a module that is not graded. <c>Label</c> says what the module was about.
/// </summary>
public record SaveAttemptModuleRequest(int? ModuleId, string? Label, int? Score, int? MaxScore);

public record AttemptModuleResponse(
    int? ModuleId,
    int Position,
    string ModuleType,
    string? Label,
    int? Score,
    int? MaxScore);

/// <summary>An attempt as it was when it was completed. <c>ActivityId</c> is null once the activity is deleted.</summary>
public record AttemptResponse(
    int Id,
    int? ActivityId,
    string ActivityTitle,
    int? Score,
    int? MaxScore,
    DateTime CompletedAt,
    IReadOnlyList<AttemptModuleResponse> Modules);

/// <summary>An attempt in a list, without its modules.</summary>
public record AttemptSummaryResponse(
    int Id,
    int? ActivityId,
    string ActivityTitle,
    int? Score,
    int? MaxScore,
    DateTime CompletedAt);

public record AttemptPageResponse(
    IReadOnlyList<AttemptSummaryResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
