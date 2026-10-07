namespace RevisionPlatform.Api.Typing;

/// <summary>
/// A finished typing test of a user: its mode, its average and highest speeds in words per
/// minute, and when it was played. Like the trivia scores, it never changes afterwards.
/// </summary>
public class TypingResult
{
    public const int ModeMaxLength = 30;

    public int Id { get; set; }
    public int UserId { get; set; }
    /// <summary>The game mode, such as <c>timed</c> (see <see cref="TypingModes"/>).</summary>
    public string Mode { get; set; } = "";
    /// <summary>The length of a timed test; null for a mode that is not timed.</summary>
    public int? DurationSeconds { get; set; }
    public int AverageWpm { get; set; }
    public int PeakWpm { get; set; }
    public DateTime PlayedAt { get; set; }
}
