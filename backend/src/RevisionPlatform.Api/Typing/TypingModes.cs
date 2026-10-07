namespace RevisionPlatform.Api.Typing;

/// <summary>
/// The typing test modes whose results can be saved. A new mode adds its key here, with
/// the rules of its own fields in <see cref="TypingService"/>.
/// </summary>
public static class TypingModes
{
    /// <summary>Type as much text as possible before the time is up.</summary>
    public const string Timed = "timed";

    public static readonly IReadOnlyList<int> TimedDurationsSeconds = [60, 120, 300];
}
