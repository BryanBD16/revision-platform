namespace RevisionPlatform.Api.Modules.Reading;

/// <summary>Content of a reading module: a text to read, with an optional title.</summary>
public record ReadingContent(string? Title, string? Body);
