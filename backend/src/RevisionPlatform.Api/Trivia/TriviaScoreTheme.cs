namespace RevisionPlatform.Api.Trivia;

/// <summary>
/// A theme chosen for a <see cref="TriviaScore"/>. The name is a copy, so renaming or deleting
/// the theme later never changes the score; <see cref="ThemeId"/> is only a link, set to null
/// when the theme is deleted.
/// </summary>
public class TriviaScoreTheme
{
    public int Id { get; set; }
    public int TriviaScoreId { get; set; }
    public int? ThemeId { get; set; }
    public required string ThemeName { get; set; }
}
