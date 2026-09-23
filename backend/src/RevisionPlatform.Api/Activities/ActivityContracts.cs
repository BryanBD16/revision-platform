using System.Text.Json;

namespace RevisionPlatform.Api.Activities;

// Request properties are nullable so that missing values reach ActivityValidator
// instead of being rejected by the framework with a different error format.
public record CreateActivityRequest(
    string? Title,
    string? Description,
    List<string?>? Themes,
    List<CreateModuleRequest?>? Modules,
    List<string?>? Courses = null);

/// <summary>The query parameters of the activity list. Missing values use the defaults.</summary>
public record ActivityListRequest(int? Page, int? PageSize);

/// <summary>A module to create; its position is its index in the request.</summary>
public record CreateModuleRequest(string? Type, JsonElement? Content);

/// <summary>A topic or a course.</summary>
public record ThemeResponse(int Id, string Name);

public record ModuleResponse(int Id, int Position, string Type, JsonElement Content);

/// <summary>An activity as shown in the list, without its modules.</summary>
public record ActivitySummaryResponse(
    int Id,
    string Title,
    string? Description,
    IReadOnlyList<ThemeResponse> Themes,
    IReadOnlyList<ThemeResponse> Courses,
    int ModuleCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

/// <summary>One page of the activity list and the total number of activities.</summary>
public record ActivityPageResponse(
    IReadOnlyList<ActivitySummaryResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

/// <summary>An activity with its modules, in order.</summary>
public record ActivityResponse(
    int Id,
    string Title,
    string? Description,
    IReadOnlyList<ThemeResponse> Themes,
    IReadOnlyList<ThemeResponse> Courses,
    IReadOnlyList<ModuleResponse> Modules,
    DateTime CreatedAt,
    DateTime UpdatedAt);
