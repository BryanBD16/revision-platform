using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Data;

namespace RevisionPlatform.Api.Themes;

public class ThemeService(AppDbContext db)
{
    /// <summary>
    /// Returns the themes of one kind (<see cref="ThemeKind"/>) used by at least one activity that
    /// the user <paramref name="viewerId"/> (null for a visitor) can see, sorted by name. The names
    /// used only by other users' private activities are not revealed.
    /// </summary>
    public async Task<IReadOnlyList<ThemeResponse>> GetAllAsync(string kind, int? viewerId)
    {
        var visibleActivities = db.RevisionActivities.VisibleTo(viewerId);
        var themes = await db.Themes
            .AsNoTracking()
            .Where(t => t.Kind == kind && visibleActivities.Any(a => a.Themes.Any(at => at.Id == t.Id)))
            .Select(t => new ThemeResponse(t.Id, t.Name))
            .ToListAsync();

        // Sorted in memory to use the same order as the themes of an activity.
        return themes.OrderBy(t => t.Name, StringComparer.InvariantCultureIgnoreCase).ToList();
    }
}
