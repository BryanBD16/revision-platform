using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Activities;

public class ActivityService(AppDbContext db)
{
    public async Task<IReadOnlyList<ActivityResponse>> GetAllAsync()
    {
        var activities = await db.RevisionActivities
            .AsNoTracking()
            .Include(a => a.Themes)
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .ToListAsync();

        return activities.Select(ToResponse).ToList();
    }

    public async Task<ActivityResponse?> GetByIdAsync(int id)
    {
        var activity = await db.RevisionActivities
            .AsNoTracking()
            .Include(a => a.Themes)
            .SingleOrDefaultAsync(a => a.Id == id);

        return activity is null ? null : ToResponse(activity);
    }

    /// <summary>Creates an activity. The request must have been validated with <see cref="ActivityValidator"/>.</summary>
    public async Task<ActivityResponse> CreateAsync(CreateActivityRequest request)
    {
        var now = DateTime.UtcNow;
        var description = request.Description?.Trim();

        var activity = new RevisionActivity
        {
            Title = request.Title!.Trim(),
            Description = string.IsNullOrEmpty(description) ? null : description,
            CreatedAt = now,
            UpdatedAt = now,
            Themes = await FindOrCreateThemesAsync(request.Themes!, now),
        };

        db.RevisionActivities.Add(activity);
        await db.SaveChangesAsync();

        return ToResponse(activity);
    }

    /// <summary>Reuses existing themes with the same name (ignoring case) and creates the missing ones.</summary>
    private async Task<List<Theme>> FindOrCreateThemesAsync(IEnumerable<string?> requestedNames, DateTime now)
    {
        var names = requestedNames
            .Select(name => name!.Trim())
            .Distinct(StringComparer.InvariantCultureIgnoreCase)
            .ToList();

        // The theme name column collation is case-insensitive, so this also matches other casings.
        var existing = await db.Themes.Where(t => names.Contains(t.Name)).ToListAsync();

        return names
            .Select(name =>
                existing.FirstOrDefault(t => string.Equals(t.Name, name, StringComparison.InvariantCultureIgnoreCase))
                ?? new Theme { Name = name, CreatedAt = now })
            .ToList();
    }

    private static ActivityResponse ToResponse(RevisionActivity activity) => new(
        activity.Id,
        activity.Title,
        activity.Description,
        activity.Themes
            .OrderBy(t => t.Name, StringComparer.InvariantCultureIgnoreCase)
            .Select(t => new ThemeResponse(t.Id, t.Name))
            .ToList(),
        // MySQL does not store the DateTime kind; all timestamps are saved in UTC.
        DateTime.SpecifyKind(activity.CreatedAt, DateTimeKind.Utc),
        DateTime.SpecifyKind(activity.UpdatedAt, DateTimeKind.Utc));
}
