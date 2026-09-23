using RevisionPlatform.Api.Modules.Matching;
using RevisionPlatform.Api.Modules.MultipleChoice;
using RevisionPlatform.Api.Modules.Reading;

namespace RevisionPlatform.Api.Modules;

public static class ModuleServiceCollectionExtensions
{
    /// <summary>Registers the module types. Add new module types here.</summary>
    public static IServiceCollection AddModuleTypes(this IServiceCollection services)
    {
        services.AddSingleton<IModuleType, ReadingModuleType>();
        services.AddSingleton<IModuleType, MultipleChoiceModuleType>();
        services.AddSingleton<IModuleType, MatchingModuleType>();

        services.AddSingleton<ModuleTypeRegistry>();
        return services;
    }
}
