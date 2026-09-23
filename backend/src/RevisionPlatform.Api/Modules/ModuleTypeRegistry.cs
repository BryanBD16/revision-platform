namespace RevisionPlatform.Api.Modules;

/// <summary>Finds the registered module type for a type key.</summary>
public class ModuleTypeRegistry(IEnumerable<IModuleType> moduleTypes)
{
    private readonly Dictionary<string, IModuleType> _moduleTypes = moduleTypes.ToDictionary(t => t.Key);

    public IModuleType? Find(string key) => _moduleTypes.GetValueOrDefault(key);
}
