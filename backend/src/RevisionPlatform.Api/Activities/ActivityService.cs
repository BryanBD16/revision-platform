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

        if (query.Visibility is not null)
        {
            activities = activities.Where(a => a.Visibility == query.Visibility);
        }

        return activities;
    }

    /// <summary>
    /// Returns the activity, or null if it does not exist or the viewer cannot see it.
    /// <paramref name="canManagePublic"/> tells whether the viewer can edit public activities.
    /// </summary>
    public async Task<ActivityResponse?> GetByIdAsync(int id, int? viewerId, bool canManagePublic)
    {
        var activity = await db.RevisionActivities
            .AsNoTracking()
            .VisibleTo(viewerId)
            .Include(a => a.Themes)
            .Include(a => a.Modules)
            .Include(a => a.LastEditedBy)
            .SingleOrDefaultAsync(a => a.Id == id);

        return activity is null ? null : ToResponse(activity, canManagePublic);
    }

    /// <summary>
    /// Whether a viewer can edit and delete an activity they can see: a private activity
    /// they can see is theirs; a public activity needs the manage-public-activities permission.
    /// </summary>
    public static bool CanEdit(RevisionActivity activity, bool canManagePublic) =>
        activity.Visibility == ActivityVisibility.Private || canManagePublic;

    /// <summary>
    /// Creates an activity and returns its id. A private activity belongs to
    /// <paramref name="creatorId"/>; a public activity has no owner. Seed activities have no creator.
    /// </summary>
    public async Task<int> CreateAsync(ValidatedActivity request, int? creatorId)
    {
        var visibility = request.Visibility ?? ActivityVisibility.Private;
        var isPublic = visibility == ActivityVisibility.Public;
        if (!isPublic && creatorId is null)
        {
            throw new ArgumentException("A private activity needs an owner.", nameof(creatorId));
        }

        var now = DateTime.UtcNow;

        var activity = new RevisionActivity
        {
            Title = request.Title,
            Description = request.Description,
            Visibility = visibility,
            OwnerId = isPublic ? null : creatorId,
            LastEditedByUserId = creatorId,
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

        return activity.Id;
    }

    /// <summary>
    /// Replaces the content of an activity. Modules with an id are updated in place and keep
    /// their id (so that saved results can refer to them), modules without id are added, and
    /// the modules missing from the request are deleted. Changing the visibility needs the
    /// publish permission: a public activity loses its owner, and an activity made private
    /// belongs to <paramref name="editorId"/>.
    /// </summary>
    public async Task<ActivityChangeResult> UpdateAsync(
        int id, ValidatedActivity request, int editorId, ActivityPermissions permissions)
    {
        var activity = await db.RevisionActivities
            .VisibleTo(editorId)
            .Include(a => a.Themes)
            .Include(a => a.Modules)
            .SingleOrDefaultAsync(a => a.Id == id);
        if (activity is null)
        {
            return ActivityChangeResult.NotFound;
        }
        if (!CanEdit(activity, permissions.CanManagePublic))
        {
            return ActivityChangeResult.Forbidden("Only admins can edit public activities.");
        }

        var visibility = request.Visibility ?? activity.Visibility;
        if (visibility != activity.Visibility && !permissions.CanPublish)
        {
            return ActivityChangeResult.Forbidden("Only admins can change the visibility of an activity.");
        }

        var existing = activity.Modules.ToDictionary(m => m.Id);
        var errors = new Dictionary<string, string[]>();
        for (var index = 0; index < request.Modules.Count; index++)
        {
            var module = request.Modules[index];
            if (module.Id is not { } moduleId)
            {
                continue;
            }
            if (!existing.TryGetValue(moduleId, out var current))
            {
                errors[$"modules[{index}].id"] = ["This module is not part of the activity."];
            }
            else if (current.Type != module.Type)
            {
                errors[$"modules[{index}].type"] =
                    ["The type of an existing module cannot change. Remove the module and add a new one."];
            }
        }
        if (errors.Count > 0)
        {
            return ActivityChangeResult.Invalid(errors);
        }

        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync();

        // Positions are unique within an activity: remove the deleted modules and move the kept
        // ones to temporary negative positions first, so that reordering never collides.
        var keptIds = request.Modules.Where(m => m.Id is not null).Select(m => m.Id!.Value).ToHashSet();
        foreach (var removed in activity.Modules.Where(m => !keptIds.Contains(m.Id)).ToList())
        {
            activity.Modules.Remove(removed);
            db.RevisionModules.Remove(removed);
        }
        foreach (var kept in activity.Modules)
        {
            kept.Position = -1 - kept.Position;
        }
        await db.SaveChangesAsync();

        for (var index = 0; index < request.Modules.Count; index++)
        {
            var module = request.Modules[index];
            var content = module.Content.GetRawText();
            if (module.Id is { } moduleId)
            {
                var current = existing[moduleId];
                current.Content = content;
                current.Position = index;
                current.UpdatedAt = now;
            }
            else
            {
                activity.Modules.Add(new RevisionModule
                {
                    Position = index,
                    Type = module.Type,
                    Content = content,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
        }

        activity.Title = request.Title;
        activity.Description = request.Description;
        activity.Themes.Clear();
        activity.Themes.AddRange(await FindOrCreateThemesAsync(request.Themes, ThemeKind.Topic, now));
        activity.Themes.AddRange(await FindOrCreateThemesAsync(request.Courses, ThemeKind.Course, now));
        if (visibility != activity.Visibility)
        {
            activity.Visibility = visibility;
            activity.OwnerId = visibility == ActivityVisibility.Public ? null : editorId;
        }
        activity.UpdatedAt = now;
        activity.LastEditedByUserId = editorId;

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return ActivityChangeResult.Done;
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

    private static ActivityResponse ToResponse(RevisionActivity activity, bool canManagePublic) => new(
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
        AsUtc(activity.UpdatedAt),
        CanEdit(activity, canManagePublic),
        // Only the people who can change a public activity see who last edited it.
        activity.Visibility == ActivityVisibility.Public && canManagePublic && activity.LastEditedBy is { } editor
            ? new ActivityEditorResponse(editor.Id, editor.DisplayName)
            : null);

    private static List<ThemeResponse> ToResponse(IEnumerable<Theme> themes, string kind) => themes
        .Where(t => t.Kind == kind)
        .OrderBy(t => t.Name, StringComparer.InvariantCultureIgnoreCase)
        .Select(t => new ThemeResponse(t.Id, t.Name))
        .ToList();

    // MySQL does not store the DateTime kind; all timestamps are saved in UTC.
    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
