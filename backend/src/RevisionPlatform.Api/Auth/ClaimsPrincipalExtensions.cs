using System.Security.Claims;

namespace RevisionPlatform.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    /// <summary>The id of the signed-in user, or null for a visitor.</summary>
    public static int? GetUserId(this ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
