using RevisionPlatform.Api.Shared;

namespace RevisionPlatform.Api.Activities;

/// <summary>
/// A list request that passed validation, with the defaults applied. An activity is listed
/// only if it matches every filter that is set: its title contains <see cref="Title"/>
/// (ignoring case), it is part of the course <see cref="CourseId"/> and it has all the
/// themes <see cref="ThemeIds"/>.
/// </summary>
public record ActivityListQuery(int Page, int PageSize, string? Title, int? CourseId, IReadOnlyList<int> ThemeIds);

/// <summary>Either the validated query, or validation errors keyed by parameter name.</summary>
public record ActivityListValidationResult(ActivityListQuery? Query, Dictionary<string, string[]> Errors);

public static class ActivityListValidator
{
    public const int MaxThemeIds = 20;

    public static ActivityListValidationResult Validate(ActivityListRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        var (page, pageSize) = Paging.Validate(request.Page, request.PageSize, errors);

        var title = request.Title?.Trim();
        if (title?.Length > RevisionActivity.TitleMaxLength)
        {
            errors["title"] = [$"The title must be at most {RevisionActivity.TitleMaxLength} characters."];
        }

        var themeIds = (request.ThemeIds ?? []).Distinct().ToList();
        if (themeIds.Count > MaxThemeIds)
        {
            errors["themeIds"] = [$"At most {MaxThemeIds} themes can be selected."];
        }

        if (errors.Count > 0)
        {
            return new ActivityListValidationResult(null, errors);
        }

        var query = new ActivityListQuery(
            page,
            pageSize,
            string.IsNullOrEmpty(title) ? null : title,
            request.CourseId,
            themeIds);
        return new ActivityListValidationResult(query, errors);
    }
}
