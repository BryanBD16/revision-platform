using Microsoft.AspNetCore.Identity;

namespace RevisionPlatform.Api.Users;

/// <summary>
/// A registered user. ASP.NET Core Identity manages the inherited properties
/// (email, password hash, lockout...); the email is also the user name.
/// </summary>
public class AppUser : IdentityUser<int>
{
    public const int DisplayNameMaxLength = 100;
    public const int EmailMaxLength = 256;

    public required string DisplayName { get; set; }
    public DateTime CreatedAt { get; set; }
}
