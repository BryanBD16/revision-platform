using System.Text.Json;

namespace RevisionPlatform.Api.Modules;

/// <summary>
/// The contract every module type implements. A module type owns the structure
/// of its JSON content: it validates the content sent by clients and returns it
/// in the form that is stored.
/// </summary>
public interface IModuleType
{
    /// <summary>The value stored in <see cref="RevisionModule.Type"/>, e.g. "reading".</summary>
    string Key { get; }

    ModuleContentResult Validate(JsonElement content);
}

/// <summary>Either the normalized content to store, or the reasons it is invalid.</summary>
public record ModuleContentResult(JsonElement? Content, IReadOnlyList<string> Errors)
{
    public static ModuleContentResult Valid(JsonElement content) => new(content, []);

    public static ModuleContentResult Invalid(IReadOnlyList<string> errors) => new(null, errors);
}
