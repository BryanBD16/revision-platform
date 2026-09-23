namespace RevisionPlatform.Api.Themes;

public class Theme
{
    public const int NameMaxLength = 100;

    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedAt { get; set; }
}
