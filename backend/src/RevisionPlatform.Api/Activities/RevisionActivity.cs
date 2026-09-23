using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Activities;

public class RevisionActivity
{
    public const int TitleMaxLength = 200;
    public const int DescriptionMaxLength = 2000;

    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<Theme> Themes { get; set; } = [];
}
