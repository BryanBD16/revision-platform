namespace RevisionPlatform.Api.Themes;

/// <summary>
/// A label used to organize activities. Its <see cref="Kind"/> tells whether it is a
/// topic (what the activity is about) or a course (where the activity is used).
/// </summary>
public class Theme
{
    public const int NameMaxLength = 100;
    public const int KindMaxLength = 20;

    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Kind { get; set; }
    public DateTime CreatedAt { get; set; }
}
