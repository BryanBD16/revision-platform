using System.Text.Json;

namespace RevisionPlatform.Api.Activities;

// Request properties are nullable so that missing values reach ActivityValidator
// instead of being rejected by the framework with a different error format.
public record CreateActivityRequest(
    string? Title,
    string? Description,
    List<string?>? Themes,
    List<CreateModuleRequest?>? Modules);

/// <summary>A module to create; its position is its index in the request.</summary>
public record CreateModuleRequest(string? Type, JsonElement? Content);

public record ThemeResponse(int Id, string Name);

public record ModuleResponse(int Id, int Position, string Type, JsonElement Content);

/// <summary>An activity as shown in the list, without its modules.</summary>
public record ActivitySummaryResponse(
    int Id,
    string Title,
    string? Description,
    IReadOnlyList<ThemeResponse> Themes,
    int ModuleCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

/// <summary>An activity with its modules, in order.</summary>
public record ActivityResponse(
    int Id,
    string Title,
    string? Description,
    IReadOnlyList<ThemeResponse> Themes,
    IReadOnlyList<ModuleResponse> Modules,
    DateTime CreatedAt,
    DateTime UpdatedAt);
