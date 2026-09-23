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
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;
    public const int MaxThemeIds = 20;

    public static ActivityListValidationResult Validate(ActivityListRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        var page = request.Page ?? 1;
        var pageSize = request.PageSize ?? DefaultPageSize;

        if (pageSize is < 1 or > MaxPageSize)
        {
            errors["pageSize"] = [$"The page size must be between 1 and {MaxPageSize}."];
        }

        if (page < 1)
        {
            errors["page"] = ["The page must be at least 1."];
        }
        else if ((long)(page - 1) * pageSize > int.MaxValue)
        {
            errors["page"] = ["The page is too large."];
        }

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
