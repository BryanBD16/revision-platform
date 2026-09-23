using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Modules;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Activities;

public class ActivityService(AppDbContext db)
{
    /// <summary>
    /// Returns one page of the activities that the user <paramref name="viewerId"/> (null for a
    /// visitor) can see and that match the query filters, newest first.
    /// </summary>
    public async Task<ActivityPageResponse> GetPageAsync(ActivityListQuery query, int? viewerId)
    {
        var matching = Filter(db.RevisionActivities.AsNoTracking().VisibleTo(viewerId), query);

        var totalCount = await matching.CountAsync();

        var activities = await matching
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Description,
                a.Themes,
                a.Visibility,
                ModuleCount = a.Modules.Count,
                a.CreatedAt,
                a.UpdatedAt,
            })
            .ToListAsync();

        var items = activities
            .Select(a => new ActivitySummaryResponse(
                a.Id,
                a.Title,
                a.Description,
                ToResponse(a.Themes, ThemeKind.Topic),
                ToResponse(a.Themes, ThemeKind.Course),
                a.Visibility,
                a.ModuleCount,
                AsUtc(a.CreatedAt),
                AsUtc(a.UpdatedAt)))
            .ToList();

        return new ActivityPageResponse(items, query.Page, query.PageSize, totalCount);
    }

    private static IQueryable<RevisionActivity> Filter(IQueryable<RevisionActivity> activities, ActivityListQuery query)
    {
        if (query.Title is not null)
        {
            // The title column collation ignores case (and accents).
            activities = activities.Where(a => a.Title.Contains(query.Title));
        }

        if (query.CourseId is { } courseId)
        {
            activities = activities.Where(a => a.Themes.Any(t => t.Id == courseId && t.Kind == ThemeKind.Course));
        }

        // Each selected theme narrows the result: the activity must have all of them.
        foreach (var themeId in query.ThemeIds)
        {
            activities = activities.Where(a => a.Themes.Any(t => t.Id == themeId && t.Kind == ThemeKind.Topic));
        }

        return activities;
    }

    /// <summary>Returns the activity, or null if it does not exist or the viewer cannot see it.</summary>
    public async Task<ActivityResponse?> GetByIdAsync(int id, int? viewerId)
    {
        var activity = await db.RevisionActivities
            .AsNoTracking()
            .VisibleTo(viewerId)
            .Include(a => a.Themes)
            .Include(a => a.Modules)
            .SingleOrDefaultAsync(a => a.Id == id);

        return activity is null ? null : ToResponse(activity);
    }

    /// <summary>
    /// Creates an activity. A private activity belongs to <paramref name="ownerId"/>; a public
    /// activity has no owner.
    /// </summary>
    public async Task<ActivityResponse> CreateAsync(ValidatedActivity request, int? ownerId)
    {
        var isPublic = request.Visibility == ActivityVisibility.Public;
        if (!isPublic && ownerId is null)
        {
            throw new ArgumentException("A private activity needs an owner.", nameof(ownerId));
        }

        var now = DateTime.UtcNow;

        var activity = new RevisionActivity
        {
            Title = request.Title,
            Description = request.Description,
            Visibility = request.Visibility,
            OwnerId = isPublic ? null : ownerId,
            CreatedAt = now,
            UpdatedAt = now,
            Themes =
            [
                .. await FindOrCreateThemesAsync(request.Themes, ThemeKind.Topic, now),
                .. await FindOrCreateThemesAsync(request.Courses, ThemeKind.Course, now),
            ],
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

    /// <summary>
    /// Reuses existing themes of the same kind with the same name (ignoring case) and creates the missing ones.
    /// </summary>
    private async Task<List<Theme>> FindOrCreateThemesAsync(IReadOnlyList<string> names, string kind, DateTime now)
    {
        if (names.Count == 0)
        {
            return [];
        }

        // The theme name column collation is case-insensitive, so this also matches other casings.
        var existing = await db.Themes.Where(t => t.Kind == kind && names.Contains(t.Name)).ToListAsync();

        return names
            .Select(name =>
                existing.FirstOrDefault(t => string.Equals(t.Name, name, StringComparison.InvariantCultureIgnoreCase))
                ?? new Theme { Name = name, Kind = kind, CreatedAt = now })
            .ToList();
    }

    private static ActivityResponse ToResponse(RevisionActivity activity) => new(
        activity.Id,
        activity.Title,
        activity.Description,
        ToResponse(activity.Themes, ThemeKind.Topic),
        ToResponse(activity.Themes, ThemeKind.Course),
        activity.Visibility,
        activity.Modules
            .OrderBy(m => m.Position)
            .Select(m => new ModuleResponse(m.Id, m.Position, m.Type, JsonSerializer.Deserialize<JsonElement>(m.Content)))
            .ToList(),
        AsUtc(activity.CreatedAt),
        AsUtc(activity.UpdatedAt));

    private static List<ThemeResponse> ToResponse(IEnumerable<Theme> themes, string kind) => themes
        .Where(t => t.Kind == kind)
        .OrderBy(t => t.Name, StringComparer.InvariantCultureIgnoreCase)
        .Select(t => new ThemeResponse(t.Id, t.Name))
        .ToList();

    // MySQL does not store the DateTime kind; all timestamps are saved in UTC.
    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
