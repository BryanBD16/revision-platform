namespace RevisionPlatform.Api.Activities;

// Properties are nullable so that missing values reach ActivityValidator
// instead of being rejected by the framework with a different error format.
public record CreateActivityRequest(string? Title, string? Description, List<string?>? Themes);

public record ThemeResponse(int Id, string Name);

public record ActivityResponse(
    int Id,
    string Title,
    string? Description,
    IReadOnlyList<ThemeResponse> Themes,
    DateTime CreatedAt,
    DateTime UpdatedAt);
