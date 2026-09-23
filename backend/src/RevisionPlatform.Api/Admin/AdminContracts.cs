namespace RevisionPlatform.Api.Admin;

/// <summary>A user as shown to admins.</summary>
public record AdminUserResponse(
    int Id,
    string Email,
    string DisplayName,
    IReadOnlyList<string> Roles,
    DateTime CreatedAt,
    bool LockedOut);

public record AdminUserPageResponse(
    IReadOnlyList<AdminUserResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

public record UserReference(int Id, string Email, string DisplayName);

/// <summary>An entry of the audit trail. <c>ChangedBy</c> is null for a command run on the server.</summary>
public record RoleChangeResponse(
    int Id,
    UserReference User,
    string Role,
    string Action,
    UserReference? ChangedBy,
    string Origin,
    DateTime ChangedAt);

public record RoleChangePageResponse(
    IReadOnlyList<RoleChangeResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
