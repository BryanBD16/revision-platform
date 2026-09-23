using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Data;

namespace RevisionPlatform.Api.Users;

/// <summary>The result of a role change: null when it succeeded, otherwise why it was refused.</summary>
public record RoleChangeError(string Message);

/// <summary>
/// Grants and revokes roles, with the safety rules and the audit trail. Used by the
/// admin endpoints and by the command line.
/// </summary>
public class RoleService(AppDbContext db, UserManager<AppUser> userManager, RoleManager<IdentityRole<int>> roleManager)
{
    public Task<bool> RoleExistsAsync(string role) => roleManager.RoleExistsAsync(role);

    public async Task<IReadOnlyList<string>> GetRoleNamesAsync() =>
        await db.Roles.Select(r => r.Name!).OrderBy(name => name).ToListAsync();

    /// <summary>Grants a role. Granting a role the user already has changes nothing.</summary>
    public async Task<RoleChangeError?> GrantAsync(AppUser user, string role, AppUser? changedBy, string origin)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            return new RoleChangeError($"The role '{role}' does not exist.");
        }
        if (await userManager.IsInRoleAsync(user, role))
        {
            return null;
        }

        return await ChangeAsync(user, role, RoleChange.Granted, changedBy, origin,
            () => userManager.AddToRoleAsync(user, role));
    }

    /// <summary>
    /// Revokes a role. Revoking a role the user does not have changes nothing. The last
    /// admin cannot be removed, and an admin cannot remove their own admin role.
    /// </summary>
    public async Task<RoleChangeError?> RevokeAsync(AppUser user, string role, AppUser? changedBy, string origin)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            return new RoleChangeError($"The role '{role}' does not exist.");
        }
        if (!await userManager.IsInRoleAsync(user, role))
        {
            return null;
        }
        if (role == RoleNames.Admin)
        {
            if (changedBy?.Id == user.Id)
            {
                return new RoleChangeError("You cannot remove your own admin role. Ask another admin.");
            }
            if ((await userManager.GetUsersInRoleAsync(RoleNames.Admin)).Count == 1)
            {
                return new RoleChangeError("The last admin cannot lose the admin role.");
            }
        }

        return await ChangeAsync(user, role, RoleChange.Revoked, changedBy, origin,
            () => userManager.RemoveFromRoleAsync(user, role));
    }

    /// <summary>Applies the change and records it in the audit trail, both or neither.</summary>
    private async Task<RoleChangeError?> ChangeAsync(
        AppUser user, string role, string action, AppUser? changedBy, string origin,
        Func<Task<IdentityResult>> change)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        var result = await change();
        if (!result.Succeeded)
        {
            return new RoleChangeError(string.Join(" ", result.Errors.Select(e => e.Description)));
        }
        // No need to touch the sessions of the user: they reload the user and its roles
        // from the database on every request (see AddAppAuthentication).

        db.RoleChanges.Add(new RoleChange
        {
            UserId = user.Id,
            RoleName = role,
            Action = action,
            ChangedByUserId = changedBy?.Id,
            Origin = origin,
            ChangedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return null;
    }
}
