using System.Text.Json;

namespace RevisionPlatform.Api.Modules;

/// <summary>
/// Base class for module types whose content maps to a C# record. It converts the
/// JSON content to <typeparamref name="TContent"/> and back, so each module type
/// only implements its own validation and normalization rules.
/// </summary>
public abstract class ModuleType<TContent> : IModuleType where TContent : class
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public abstract string Key { get; }

    public ModuleContentResult Validate(JsonElement content)
    {
        var parsed = Parse(content);
        if (parsed is null)
        {
            return ModuleContentResult.Invalid([$"The content is not valid for a {Key} module."]);
        }

        var errors = Validate(parsed);
        return errors.Count > 0
            ? ModuleContentResult.Invalid(errors)
            : ModuleContentResult.Valid(JsonSerializer.SerializeToElement(Normalize(parsed), JsonOptions));
    }

    /// <summary>Returns the validation errors for the content; empty when it is valid.</summary>
    protected abstract IReadOnlyList<string> Validate(TContent content);

    /// <summary>Returns the content as it is stored, e.g. with surrounding spaces removed.</summary>
    protected abstract TContent Normalize(TContent content);

    private static TContent? Parse(JsonElement content)
    {
        if (content.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        try
        {
            return content.Deserialize<TContent>(JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
