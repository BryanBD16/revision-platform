namespace RevisionPlatform.Api.Users;

/// <summary>
/// One entry of the audit trail of the roles: a role granted to or revoked from a
/// user, by an admin in the application or by someone with server access.
/// </summary>
public class RoleChange
{
    public const int ActionMaxLength = 20;
    public const int OriginMaxLength = 200;

    public const string Granted = "granted";
    public const string Revoked = "revoked";

    public int Id { get; set; }
    public int UserId { get; set; }
    public required string RoleName { get; set; }

    /// <summary><see cref="Granted"/> or <see cref="Revoked"/>.</summary>
    public required string Action { get; set; }

    /// <summary>The admin who made the change, or null for a command run on the server.</summary>
    public int? ChangedByUserId { get; set; }

    /// <summary>Where the change was made, for example "admin page" or "command line (bob@server)".</summary>
    public required string Origin { get; set; }

    public DateTime ChangedAt { get; set; }

    public AppUser? User { get; set; }
    public AppUser? ChangedBy { get; set; }
}
