using Microsoft.AspNetCore.Authorization;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Auth;

/// <summary>
/// What a user is allowed to do. The code checks these permissions, never the role
/// names, so giving a permission to another role only changes <see cref="Add"/>.
/// </summary>
public static class Policies
{
    public const string PublishActivities = "publish-activities";
    public const string ManagePublicActivities = "manage-public-activities";
    public const string ManageRoles = "manage-roles";

    /// <summary>All the permissions, as returned to the frontend.</summary>
    public static readonly IReadOnlyList<string> All = [PublishActivities, ManagePublicActivities, ManageRoles];

    public static void Add(AuthorizationOptions options)
    {
        options.AddPolicy(PublishActivities, policy => policy.RequireRole(RoleNames.Admin));
        // Edit and delete any public activity, and change the visibility of an activity.
        options.AddPolicy(ManagePublicActivities, policy => policy.RequireRole(RoleNames.Admin));
        options.AddPolicy(ManageRoles, policy => policy.RequireRole(RoleNames.Admin));
    }
}
