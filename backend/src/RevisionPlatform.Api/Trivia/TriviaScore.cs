namespace RevisionPlatform.Api.Trivia;

/// <summary>
/// A finished trivia game of a user: the number of correct answers in a row and the themes
/// chosen. Like the attempts, it never changes afterwards.
/// </summary>
public class TriviaScore
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int Score { get; set; }
    public DateTime PlayedAt { get; set; }

    public List<TriviaScoreTheme> Themes { get; set; } = [];
}
