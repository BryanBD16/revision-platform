using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Modules;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Activities;

public class ActivityService(AppDbContext db)
{
    public async Task<IReadOnlyList<ActivitySummaryResponse>> GetAllAsync()
    {
        var activities = await db.RevisionActivities
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Description,
                a.Themes,
                ModuleCount = a.Modules.Count,
                a.CreatedAt,
                a.UpdatedAt,
            })
            .ToListAsync();

        return activities
            .Select(a => new ActivitySummaryResponse(
                a.Id,
                a.Title,
                a.Description,
                ToResponse(a.Themes),
                a.ModuleCount,
                AsUtc(a.CreatedAt),
                AsUtc(a.UpdatedAt)))
            .ToList();
    }

    public async Task<ActivityResponse?> GetByIdAsync(int id)
    {
        var activity = await db.RevisionActivities
            .AsNoTracking()
            .Include(a => a.Themes)
            .Include(a => a.Modules)
            .SingleOrDefaultAsync(a => a.Id == id);

        return activity is null ? null : ToResponse(activity);
    }

    public async Task<ActivityResponse> CreateAsync(ValidatedActivity request)
    {
        var now = DateTime.UtcNow;

        var activity = new RevisionActivity
        {
            Title = request.Title,
            Description = request.Description,
            CreatedAt = now,
            UpdatedAt = now,
            Themes = await FindOrCreateThemesAsync(request.Themes, now),
            Modules = request.Modules
                .Select((module, index) => new RevisionModule
                {
                    Position = index,
                    Type = module.Type,
                    Content = module.Content.GetRawText(),
                    CreatedAt = now,
                    UpdatedAt = now,
                })
                .ToList(),
        };

        db.RevisionActivities.Add(activity);
        await db.SaveChangesAsync();

        return ToResponse(activity);
    }

    /// <summary>Reuses existing themes with the same name (ignoring case) and creates the missing ones.</summary>
    private async Task<List<Theme>> FindOrCreateThemesAsync(IReadOnlyList<string> names, DateTime now)
    {
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
        ToResponse(activity.Themes),
        activity.Modules
            .OrderBy(m => m.Position)
            .Select(m => new ModuleResponse(m.Id, m.Position, m.Type, JsonSerializer.Deserialize<JsonElement>(m.Content)))
            .ToList(),
        AsUtc(activity.CreatedAt),
        AsUtc(activity.UpdatedAt));

    private static List<ThemeResponse> ToResponse(IEnumerable<Theme> themes) => themes
        .OrderBy(t => t.Name, StringComparer.InvariantCultureIgnoreCase)
        .Select(t => new ThemeResponse(t.Id, t.Name))
        .ToList();

    // MySQL does not store the DateTime kind; all timestamps are saved in UTC.
    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
