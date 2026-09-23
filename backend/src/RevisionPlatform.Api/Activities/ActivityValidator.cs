using System.Text.Json;
using RevisionPlatform.Api.Modules;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Activities;

/// <summary>A create request that passed validation, with its values normalized.</summary>
public record ValidatedActivity(
    string Title,
    string? Description,
    IReadOnlyList<string> Themes,
    IReadOnlyList<ValidatedModule> Modules);

public record ValidatedModule(string Type, JsonElement Content);

/// <summary>Either the validated activity, or validation errors keyed by field name.</summary>
public record ActivityValidationResult(ValidatedActivity? Activity, Dictionary<string, string[]> Errors);

public class ActivityValidator(ModuleTypeRegistry moduleTypes)
{
    public ActivityValidationResult Validate(CreateActivityRequest request)
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

        var themes = ValidateThemes(request.Themes ?? [], errors);
        var modules = ValidateModules(request.Modules ?? [], errors);

        if (errors.Count > 0)
        {
            return new ActivityValidationResult(null, errors);
        }

        var activity = new ValidatedActivity(
            title!,
            string.IsNullOrEmpty(description) ? null : description,
            themes,
            modules);
        return new ActivityValidationResult(activity, errors);
    }

    /// <summary>Returns the trimmed theme names without duplicates (ignoring case).</summary>
    private static List<string> ValidateThemes(List<string?> themes, Dictionary<string, string[]> errors)
    {
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

        return themes
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name!.Trim())
            .Distinct(StringComparer.InvariantCultureIgnoreCase)
            .ToList();
    }

    /// <summary>Validates each module with its module type and returns the normalized modules.</summary>
    private List<ValidatedModule> ValidateModules(List<CreateModuleRequest?> modules, Dictionary<string, string[]> errors)
    {
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

            validated.Add(new ValidatedModule(moduleType.Key, result.Content.Value));
        }

        return validated;
    }
}
