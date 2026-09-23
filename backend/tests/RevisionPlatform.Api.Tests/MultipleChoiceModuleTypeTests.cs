using System.Text.Json;
using RevisionPlatform.Api.Modules.MultipleChoice;

namespace RevisionPlatform.Api.Tests;

public class MultipleChoiceModuleTypeTests
{
    private readonly MultipleChoiceModuleType _moduleType = new();

    private static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value);

    private static object[] Choices(int count) =>
        Enumerable.Range(1, count).Select(i => (object)new { id = $"c{i}", text = $"Choice {i}" }).ToArray();

    private static object Content(
        string? question = "Question?",
        object[]? choices = null,
        string?[]? correctChoiceIds = null,
        string? explanation = null) => new
    {
        question,
        choices = choices ?? Choices(2),
        correctChoiceIds = correctChoiceIds ?? ["c1"],
        explanation,
    };

    [Fact]
    public void Validate_ReturnsNormalizedContent()
    {
        var result = _moduleType.Validate(Json(new
        {
            question = "  What is a cell?  ",
            choices = new[]
            {
                new { id = " a ", text = "  A unit of life " },
                new { id = "b", text = "A planet" },
                new { id = "c", text = "The basic unit of organisms" },
            },
            correctChoiceIds = new[] { "c", " a", "c" },
            explanation = "   ",
        }));

        Assert.Empty(result.Errors);
        Assert.Equal(
            """{"question":"What is a cell?","choices":[{"id":"a","text":"A unit of life"},{"id":"b","text":"A planet"},{"id":"c","text":"The basic unit of organisms"}],"correctChoiceIds":["a","c"],"explanation":null}""",
            result.Content?.GetRawText());
    }

    [Fact]
    public void Validate_KeepsExplanation()
    {
        var result = _moduleType.Validate(Json(Content(explanation: "  Because.  ")));

        Assert.Equal("Because.", result.Content?.GetProperty("explanation").GetString());
    }

    public static TheoryData<object, string> InvalidContents => new()
    {
        { Content(question: null), "The question is required." },
        { Content(question: "  "), "The question is required." },
        { Content(question: new string('q', 1001)), "The question must be at most 1000 characters." },
        { Content(choices: Choices(1)), "A question must have between 2 and 10 choices." },
        { Content(choices: Choices(11)), "A question must have between 2 and 10 choices." },
        { Content(choices: [new { id = "c1", text = "A" }, new { id = " ", text = "B" }]), "Each choice must have an id." },
        { Content(choices: [new { id = "c1", text = "A" }, new { id = new string('i', 51), text = "B" }]), "Choice ids must be at most 50 characters." },
        { Content(choices: [new { id = "c1", text = "A" }, new { id = " c1 ", text = "B" }]), "Choice ids must be unique." },
        { Content(choices: [new { id = "c1", text = "A" }, new { id = "c2", text = "" }]), "Each choice must have a text." },
        { Content(choices: [new { id = "c1", text = "A" }, new { id = "c2", text = new string('t', 501) }]), "Choice texts must be at most 500 characters." },
        { Content(correctChoiceIds: []), "At least one choice must be marked as correct." },
        { Content(correctChoiceIds: ["c3"]), "The correct answers must be choices of the question." },
        { Content(correctChoiceIds: [null]), "The correct answers must be choices of the question." },
        { Content(explanation: new string('e', 2001)), "The explanation must be at most 2000 characters." },
        { new { question = "Q?", correctChoiceIds = new[] { "c1" } }, "A question must have between 2 and 10 choices." },
    };

    [Theory]
    [MemberData(nameof(InvalidContents))]
    public void Validate_RejectsInvalidContent(object content, string error)
    {
        var result = _moduleType.Validate(Json(content));

        Assert.Null(result.Content);
        Assert.Contains(error, result.Errors);
    }

    [Fact]
    public void Validate_RejectsNullChoice()
    {
        var result = _moduleType.Validate(Json(new
        {
            question = "Q?",
            choices = new object?[] { new { id = "c1", text = "A" }, null },
            correctChoiceIds = new[] { "c1" },
        }));

        Assert.Null(result.Content);
        Assert.Contains("Each choice must have an id.", result.Errors);
    }

    [Fact]
    public void Validate_AcceptsLimits()
    {
        var result = _moduleType.Validate(Json(Content(
            question: new string('q', 1000),
            choices: Choices(10),
            correctChoiceIds: ["c1", "c10"],
            explanation: new string('e', 2000))));

        Assert.Empty(result.Errors);
    }
}
