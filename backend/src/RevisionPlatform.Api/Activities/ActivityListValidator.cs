namespace RevisionPlatform.Api.Activities;

/// <summary>A list request that passed validation, with the defaults applied.</summary>
public record ActivityListQuery(int Page, int PageSize);

/// <summary>Either the validated query, or validation errors keyed by parameter name.</summary>
public record ActivityListValidationResult(ActivityListQuery? Query, Dictionary<string, string[]> Errors);

public static class ActivityListValidator
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

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

        return errors.Count > 0
            ? new ActivityListValidationResult(null, errors)
            : new ActivityListValidationResult(new ActivityListQuery(page, pageSize), errors);
    }
}
