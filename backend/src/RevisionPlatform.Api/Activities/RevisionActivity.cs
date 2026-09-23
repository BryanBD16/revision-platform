using RevisionPlatform.Api.Modules;
using RevisionPlatform.Api.Themes;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Activities;

public class RevisionActivity
{
    public const int TitleMaxLength = 200;
    public const int DescriptionMaxLength = 2000;
    public const int VisibilityMaxLength = 20;

    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary><see cref="ActivityVisibility.Private"/> or <see cref="ActivityVisibility.Public"/>.</summary>
    public required string Visibility { get; set; }

    /// <summary>The user who owns a private activity; always null for a public activity.</summary>
    public int? OwnerId { get; set; }

    /// <summary>
    /// The user who created or last edited the activity. Useful for public activities, which
    /// have no owner and can be edited by any admin. Null for the seed activities.
    /// </summary>
    public int? LastEditedByUserId { get; set; }
    public AppUser? LastEditedBy { get; set; }

    public List<Theme> Themes { get; set; } = [];

    /// <summary>The modules in the order they are completed (see <see cref="RevisionModule.Position"/>).</summary>
    public List<RevisionModule> Modules { get; set; } = [];
}
