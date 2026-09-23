namespace RevisionPlatform.Api.Shared;

/// <summary>The page/pageSize query parameters shared by the paginated lists.</summary>
public static class Paging
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    /// <summary>
    /// Applies the defaults (page 1, 20 items) and adds errors keyed "page" and
    /// "pageSize" for invalid values.
    /// </summary>
    public static (int Page, int PageSize) Validate(int? page, int? pageSize, Dictionary<string, string[]> errors)
    {
        var validPage = page ?? 1;
        var validPageSize = pageSize ?? DefaultPageSize;

        if (validPageSize is < 1 or > MaxPageSize)
        {
            errors["pageSize"] = [$"The page size must be between 1 and {MaxPageSize}."];
        }

        if (validPage < 1)
        {
            errors["page"] = ["The page must be at least 1."];
        }
        else if ((long)(validPage - 1) * validPageSize > int.MaxValue)
        {
            errors["page"] = ["The page is too large."];
        }

        return (validPage, validPageSize);
    }
}
