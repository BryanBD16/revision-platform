namespace RevisionPlatform.Api.Attempts;

/// <summary>
/// A completed activity, as it was when the user completed it. The titles and the scores
/// are copies, so editing or deleting the activity or its modules later never changes
/// the attempt; <see cref="ActivityId"/> is only a link, set to null when the activity is deleted.
/// </summary>
public class ActivityAttempt
{
    public const int ActivityTitleMaxLength = 200;

    public int Id { get; set; }
    public int UserId { get; set; }
    public int? ActivityId { get; set; }
    public required string ActivityTitle { get; set; }

    /// <summary>The sum of the scores of the graded modules; null when no module is graded.</summary>
    public int? Score { get; set; }
    public int? MaxScore { get; set; }

    public DateTime CompletedAt { get; set; }

    /// <summary>The modules of the activity when it was completed, in order.</summary>
    public List<AttemptModule> Modules { get; set; } = [];
}
