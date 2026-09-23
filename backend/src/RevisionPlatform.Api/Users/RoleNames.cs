namespace RevisionPlatform.Api.Users;

/// <summary>
/// The roles that exist. A user without any role is a regular user. Each role is
/// a row of the roles table, created by a migration (see AppDbContext).
/// </summary>
public static class RoleNames
{
    public const string Admin = "admin";
}
