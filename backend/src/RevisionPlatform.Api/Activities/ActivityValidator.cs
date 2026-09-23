using System.Text.Json;
using RevisionPlatform.Api.Modules;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Activities;

/// <summary>A create request that passed validation, with its values normalized.</summary>
public record ValidatedActivity(
    string Title,
    string? Description,
    IReadOnlyList<string> Themes,
    IReadOnlyList<string> Courses,
    IReadOnlyList<ValidatedModule> Modules,
    string? Visibility);

/// <summary>A validated module; <see cref="Id"/> is the existing module it updates, if any.</summary>
public record ValidatedModule(string Type, JsonElement Content, int? Id = null);

/// <summary>Either the validated activity, or validation errors keyed by field name.</summary>
public record ActivityValidationResult(ValidatedActivity? Activity, Dictionary<string, string[]> Errors);

public class ActivityValidator(ModuleTypeRegistry moduleTypes)
{
    /// <summary>
    /// Validates a request to create an activity or, with <paramref name="isUpdate"/>, to update
    /// one. Whether the module ids belong to the activity is checked by <see cref="ActivityService"/>.
    /// </summary>
    public ActivityValidationResult Validate(SaveActivityRequest request, bool isUpdate = false)
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

        var description = request.Description?.Trim();
        if (description?.Length > RevisionActivity.DescriptionMaxLength)
        {
            errors["description"] =
                [$"The description must be at most {RevisionActivity.DescriptionMaxLength} characters."];
        }

        var themes = ValidateNames(request.Themes ?? [], "themes", "Theme", errors);
        if (themes.Count == 0 && !errors.ContainsKey("themes"))
        {
            errors["themes"] = ["At least one theme is required."];
        }

        // Courses are optional: an activity can be part of any number of courses.
        var courses = ValidateNames(request.Courses ?? [], "courses", "Course", errors);
        var modules = ValidateModules(request.Modules ?? [], isUpdate, errors);

        // Missing: private for a new activity, unchanged for an update. Whether the user may
        // publish or change the visibility is checked by the controller and the service.
        var visibility = request.Visibility;
        if (visibility is not null && !ActivityVisibility.All.Contains(visibility))
        {
            errors["visibility"] = ["The visibility must be 'private' or 'public'."];
        }

        if (errors.Count > 0)
        {
            return new ActivityValidationResult(null, errors);
        }

        var activity = new ValidatedActivity(
            title!,
            string.IsNullOrEmpty(description) ? null : description,
            themes,
            courses,
            modules,
            visibility);
        return new ActivityValidationResult(activity, errors);
    }

    /// <summary>Returns the trimmed theme or course names without duplicates (ignoring case).</summary>
    private static List<string> ValidateNames(
        List<string?> names, string field, string label, Dictionary<string, string[]> errors)
    {
        if (names.Any(string.IsNullOrWhiteSpace))
        {
            errors[field] = [$"{label} names cannot be empty."];
        }
        else if (names.Any(name => name!.Trim().Length > Theme.NameMaxLength))
        {
            errors[field] = [$"{label} names must be at most {Theme.NameMaxLength} characters."];
        }

        return names
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name!.Trim())
            .Distinct(StringComparer.InvariantCultureIgnoreCase)
            .ToList();
    }

    /// <summary>Validates each module with its module type and returns the normalized modules.</summary>
    private List<ValidatedModule> ValidateModules(
        List<SaveModuleRequest?> modules, bool isUpdate, Dictionary<string, string[]> errors)
    {
        var seenIds = new HashSet<int>();
        if (modules.Count == 0)
        {
            errors["modules"] = ["At least one module is required."];
        }

        var validated = new List<ValidatedModule>();
        for (var index = 0; index < modules.Count; index++)
        {
            var field = $"modules[{index}]";
            var module = modules[index];

            if (module is null)
            {
                errors[field] = ["The module is required."];
                continue;
            }

            if (module.Id is { } id)
            {
                if (!isUpdate)
                {
                    errors[$"{field}.id"] = ["A new activity cannot contain existing modules."];
                    continue;
                }
                if (!seenIds.Add(id))
                {
                    errors[$"{field}.id"] = ["This module appears more than once."];
                    continue;
                }
            }

            var moduleType = string.IsNullOrEmpty(module.Type) ? null : moduleTypes.Find(module.Type);
            if (moduleType is null)
            {
                errors[$"{field}.type"] = [$"Unknown module type '{module.Type}'."];
                continue;
            }

            var result = moduleType.Validate(module.Content ?? default);
            if (result.Content is null)
            {
                errors[$"{field}.content"] = result.Errors.ToArray();
                continue;
            }

            validated.Add(new ValidatedModule(moduleType.Key, result.Content.Value, module.Id));
        }

        return validated;
    }
}
