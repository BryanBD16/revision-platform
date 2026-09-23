using System.Text.Json;
using RevisionPlatform.Api.Modules.Reading;

namespace RevisionPlatform.Api.Tests;

public class ReadingModuleTypeTests
{
    private readonly ReadingModuleType _moduleType = new();

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement;

    [Fact]
    public void Validate_ReturnsTrimmedContent()
    {
        var result = _moduleType.Validate(Json("""{ "title": "  Intro  ", "body": "  Some text  " }"""));

        Assert.Empty(result.Errors);
        Assert.Equal("""{"title":"Intro","body":"Some text"}""", result.Content?.GetRawText());
    }

    [Fact]
    public void Validate_StoresBlankTitleAsNull()
    {
        var result = _moduleType.Validate(Json("""{ "title": "  ", "body": "Some text" }"""));

        Assert.Equal("""{"title":null,"body":"Some text"}""", result.Content?.GetRawText());
    }

    [Fact]
    public void Validate_IgnoresUnknownProperties()
    {
        var result = _moduleType.Validate(Json("""{ "body": "Some text", "extra": 1 }"""));

        Assert.Equal("""{"title":null,"body":"Some text"}""", result.Content?.GetRawText());
    }

    [Theory]
    [InlineData("""{ }""", "The text to read is required.")]
    [InlineData("""{ "body": "   " }""", "The text to read is required.")]
    [InlineData("""{ "body": 42 }""", "The content is not valid for a reading module.")]
    [InlineData("""[ "body" ]""", "The content is not valid for a reading module.")]
    [InlineData("\"text\"", "The content is not valid for a reading module.")]
    public void Validate_RejectsInvalidContent(string json, string error)
    {
        var result = _moduleType.Validate(Json(json));

        Assert.Null(result.Content);
        Assert.Equal([error], result.Errors);
    }

    [Fact]
    public void Validate_RejectsUndefinedContent()
    {
        var result = _moduleType.Validate(default);

        Assert.Null(result.Content);
    }

    [Fact]
    public void Validate_EnforcesMaximumLengths()
    {
        var content = JsonSerializer.SerializeToElement(new
        {
            title = new string('t', ReadingModuleType.TitleMaxLength + 1),
            body = new string('b', ReadingModuleType.BodyMaxLength + 1),
        });

        var result = _moduleType.Validate(content);

        Assert.Equal(
        [
            "The title must be at most 200 characters.",
            "The text to read must be at most 20000 characters.",
        ], result.Errors);
    }

    [Fact]
    public void Validate_AcceptsMaximumLengths()
    {
        var content = JsonSerializer.SerializeToElement(new
        {
            title = new string('t', ReadingModuleType.TitleMaxLength),
            body = new string('b', ReadingModuleType.BodyMaxLength),
        });

        Assert.Empty(_moduleType.Validate(content).Errors);
    }
}
