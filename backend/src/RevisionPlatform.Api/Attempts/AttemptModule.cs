namespace RevisionPlatform.Api.Attempts;

/// <summary>The result of one module of an <see cref="ActivityAttempt"/>.</summary>
public class AttemptModule
{
    public const int LabelMaxLength = 1000;

    public int Id { get; set; }
    public int AttemptId { get; set; }

    /// <summary>A link to the module, set to null when the module or its activity is deleted.</summary>
    public int? ModuleId { get; set; }

    public int Position { get; set; }
    public required string ModuleType { get; set; }

    /// <summary>What the module was about (its title or question), given by the frontend.</summary>
    public string? Label { get; set; }

    /// <summary>Null for a module that is not graded, such as a reading.</summary>
    public int? Score { get; set; }
    public int? MaxScore { get; set; }
}
