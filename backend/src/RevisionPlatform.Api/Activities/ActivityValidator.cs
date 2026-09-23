using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Activities;

public static class ActivityValidator
{
    /// <summary>Returns validation errors keyed by field name; empty when the request is valid.</summary>
    public static Dictionary<string, string[]> Validate(CreateActivityRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        var title = request.Title?.Trim();
        if (string.IsNullOrEmpty(title))
        {
            errors["title"] = ["The title is required."];
        }
        else if (title.Length > RevisionActivity.TitleMaxLength)
        {
            errors["title"] = [$"The title must be at most {RevisionActivity.TitleMaxLength} characters."];
        }

        if (request.Description?.Trim().Length > RevisionActivity.DescriptionMaxLength)
        {
            errors["description"] =
                [$"The description must be at most {RevisionActivity.DescriptionMaxLength} characters."];
        }

        var themes = request.Themes ?? [];
        if (themes.Count == 0)
        {
            errors["themes"] = ["At least one theme is required."];
        }
        else if (themes.Any(string.IsNullOrWhiteSpace))
        {
            errors["themes"] = ["Theme names cannot be empty."];
        }
        else if (themes.Any(name => name!.Trim().Length > Theme.NameMaxLength))
        {
            errors["themes"] = [$"Theme names must be at most {Theme.NameMaxLength} characters."];
        }

        return errors;
    }
}
