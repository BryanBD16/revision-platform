namespace RevisionPlatform.Api.Modules;

/// <summary>
/// One step of a revision activity. <see cref="Content"/> is a JSON document whose
/// structure depends on <see cref="Type"/> and is validated by that module type.
/// </summary>
public class RevisionModule
{
    public const int TypeMaxLength = 50;

    public int Id { get; set; }
    public int ActivityId { get; set; }
    public int Position { get; set; }
    public required string Type { get; set; }
    public required string Content { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
