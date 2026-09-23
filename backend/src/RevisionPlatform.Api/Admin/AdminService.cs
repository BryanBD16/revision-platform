using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Admin;

/// <summary>The queries of the admin page. Role changes go through <see cref="RoleService"/>.</summary>
public class AdminService(AppDbContext db)
{
    public const int SearchMaxLength = 256;

    /// <summary>Returns a page of users sorted by email, optionally those whose email or display name contains <paramref name="search"/>.</summary>
    public async Task<AdminUserPageResponse> GetUsersAsync(string? search, int page, int pageSize)
    {
        var users = db.Users.AsNoTracking();
        if (!string.IsNullOrEmpty(search))
        {
            users = users.Where(u => u.Email!.Contains(search) || u.DisplayName.Contains(search));
        }

        var totalCount = await users.CountAsync();
        var now = DateTimeOffset.UtcNow;
        var rows = await users
            .OrderBy(u => u.Email)
            .ThenBy(u => u.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.DisplayName,
                Roles = db.UserRoles
                    .Where(ur => ur.UserId == u.Id)
                    .Join(db.Roles, ur => ur.RoleId, r => r.Id, (_, r) => r.Name!)
                    .ToList(),
                u.CreatedAt,
                LockedOut = u.LockoutEnd != null && u.LockoutEnd > now,
            })
            .ToListAsync();

        var items = rows
            .Select(u => new AdminUserResponse(
                u.Id, u.Email!, u.DisplayName, u.Roles.Order().ToList(), AsUtc(u.CreatedAt), u.LockedOut))
            .ToList();
        return new AdminUserPageResponse(items, page, pageSize, totalCount);
    }

    /// <summary>Returns a page of the audit trail of the roles, newest first.</summary>
    public async Task<RoleChangePageResponse> GetRoleChangesAsync(int page, int pageSize)
    {
        var totalCount = await db.RoleChanges.CountAsync();
        var changes = await db.RoleChanges
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.ChangedBy)
            .OrderByDescending(c => c.ChangedAt)
            .ThenByDescending(c => c.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = changes
            .Select(c => new RoleChangeResponse(
                c.Id,
                ToReference(c.User!),
                c.RoleName,
                c.Action,
                c.ChangedBy is null ? null : ToReference(c.ChangedBy),
                c.Origin,
                AsUtc(c.ChangedAt)))
            .ToList();
        return new RoleChangePageResponse(items, page, pageSize, totalCount);
    }

    private static UserReference ToReference(AppUser user) => new(user.Id, user.Email!, user.DisplayName);

    // MySQL does not store the DateTime kind; all timestamps are saved in UTC.
    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
