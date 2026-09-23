using System.Text.Json;
using RevisionPlatform.Api.Modules.Matching;

namespace RevisionPlatform.Api.Tests;

public class MatchingModuleTypeTests
{
    private readonly MatchingModuleType _moduleType = new();

    private static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value);

    private static object[] Pairs(int count) => Enumerable.Range(1, count)
        .Select(i => (object)new { id = $"p{i}", concept = $"Concept {i}", definition = $"Definition {i}" })
        .ToArray();

    private static object Content(object[]? pairs = null, string? instructions = null) =>
        new { instructions, pairs = pairs ?? Pairs(2) };

    [Fact]
    public void Validate_ReturnsNormalizedContent()
    {
        var result = _moduleType.Validate(Json(new
        {
            instructions = "   ",
            pairs = new[]
            {
                new { id = " p1 ", concept = "  Mitosis ", definition = " Division into two identical cells " },
                new { id = "p2", concept = "Meiosis", definition = "Division producing gametes" },
            },
        }));

        Assert.Empty(result.Errors);
        Assert.Equal(
            """{"instructions":null,"pairs":[{"id":"p1","concept":"Mitosis","definition":"Division into two identical cells"},{"id":"p2","concept":"Meiosis","definition":"Division producing gametes"}]}""",
            result.Content?.GetRawText());
    }

    [Fact]
    public void Validate_KeepsInstructions()
    {
        var result = _moduleType.Validate(Json(Content(instructions: "  Match each process.  ")));

        Assert.Equal("Match each process.", result.Content?.GetProperty("instructions").GetString());
    }

    private static object Pair(string id, string concept, string definition) => new { id, concept, definition };

    public static TheoryData<object, string> InvalidContents => new()
    {
        { Content(instructions: new string('i', 501)), "The instructions must be at most 500 characters." },
        { Content(pairs: Pairs(1)), "A matching module must have between 2 and 10 pairs." },
        { Content(pairs: Pairs(11)), "A matching module must have between 2 and 10 pairs." },
        { new { instructions = (string?)null }, "A matching module must have between 2 and 10 pairs." },
        { Content(pairs: [Pair("p1", "A", "a"), Pair(" ", "B", "b")]), "Each pair must have an id." },
        { Content(pairs: [Pair("p1", "A", "a"), Pair(new string('i', 51), "B", "b")]), "Pair ids must be at most 50 characters." },
        { Content(pairs: [Pair("p1", "A", "a"), Pair("p1 ", "B", "b")]), "Pair ids must be unique." },
        { Content(pairs: [Pair("p1", "A", "a"), Pair("p2", " ", "b")]), "Each pair must have a concept." },
        { Content(pairs: [Pair("p1", "A", "a"), Pair("p2", new string('c', 201), "b")]), "Each concept must be at most 200 characters." },
        { Content(pairs: [Pair("p1", "Mitosis", "a"), Pair("p2", " mitosis", "b")]), "Each concept must be different." },
        { Content(pairs: [Pair("p1", "A", "a"), Pair("p2", "B", "")]), "Each pair must have a definition." },
        { Content(pairs: [Pair("p1", "A", "a"), Pair("p2", "B", new string('d', 1001))]), "Each definition must be at most 1000 characters." },
        { Content(pairs: [Pair("p1", "A", "Same text"), Pair("p2", "B", "SAME TEXT")]), "Each definition must be different." },
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
    public void Validate_RejectsNullPair()
    {
        var result = _moduleType.Validate(Json(new { pairs = new object?[] { Pair("p1", "A", "a"), null } }));

        Assert.Null(result.Content);
        Assert.Contains("Each pair must have an id.", result.Errors);
    }

    [Fact]
    public void Validate_AcceptsLimits()
    {
        var pairs = Enumerable.Range(1, 10)
            .Select(i => Pair($"p{i}", new string('c', 199) + (char)('a' + i), new string('d', 999) + (char)('a' + i)))
            .ToArray();

        var result = _moduleType.Validate(Json(Content(pairs: pairs, instructions: new string('i', 500))));

        Assert.Empty(result.Errors);
    }
}
