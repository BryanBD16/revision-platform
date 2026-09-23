using System.Text.Json;

namespace RevisionPlatform.Api.Activities;

// Request properties are nullable so that missing values reach ActivityValidator
// instead of being rejected by the framework with a different error format.

/// <summary>The body of POST /api/activities (create) and PUT /api/activities/{id} (update).</summary>
public record SaveActivityRequest(
    string? Title,
    string? Description,
    List<string?>? Themes,
    List<SaveModuleRequest?>? Modules,
    List<string?>? Courses = null,
    string? Visibility = null);

/// <summary>
/// The query parameters of the activity list. Missing values use the defaults and
/// missing filters are not applied. <c>ThemeIds</c> is repeated: <c>?themeIds=1&amp;themeIds=2</c>.
/// </summary>
public record ActivityListRequest(
    int? Page,
    int? PageSize,
    string? Title,
    int? CourseId,
    List<int>? ThemeIds,
    string? Visibility = null);

/// <summary>
/// A module of the activity; its position is its index in the request. When updating an
/// activity, <c>Id</c> identifies an existing module to keep (and update); a module without
/// id is new.
/// </summary>
public record SaveModuleRequest(string? Type, JsonElement? Content, int? Id = null);

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
    string Visibility,
    int ModuleCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

/// <summary>One page of the activity list and the total number of activities.</summary>
public record ActivityPageResponse(
    IReadOnlyList<ActivitySummaryResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

/// <summary>The user who last edited an activity.</summary>
public record ActivityEditorResponse(int Id, string DisplayName);

/// <summary>
/// An activity with its modules, in order. <c>CanEdit</c> tells whether the caller can edit and
/// delete it; <c>LastEditedBy</c> is only given to them, for public activities.
/// </summary>
public record ActivityResponse(
    int Id,
    string Title,
    string? Description,
    IReadOnlyList<ThemeResponse> Themes,
    IReadOnlyList<ThemeResponse> Courses,
    string Visibility,
    IReadOnlyList<ModuleResponse> Modules,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool CanEdit,
    ActivityEditorResponse? LastEditedBy);
