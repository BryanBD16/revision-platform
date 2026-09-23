using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Data;

namespace RevisionPlatform.Api.Themes;

public class ThemeService(AppDbContext db)
{
    /// <summary>Returns all the themes of one kind (<see cref="ThemeKind"/>), sorted by name.</summary>
    public async Task<IReadOnlyList<ThemeResponse>> GetAllAsync(string kind)
    {
        var themes = await db.Themes
            .AsNoTracking()
            .Where(t => t.Kind == kind)
            .Select(t => new ThemeResponse(t.Id, t.Name))
            .ToListAsync();

        // Sorted in memory to use the same order as the themes of an activity.
        return themes.OrderBy(t => t.Name, StringComparer.InvariantCultureIgnoreCase).ToList();
    }
}
