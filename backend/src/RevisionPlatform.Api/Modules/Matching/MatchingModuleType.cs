namespace RevisionPlatform.Api.Modules.Matching;

public class MatchingModuleType : ModuleType<MatchingContent>
{
    public const int InstructionsMaxLength = 500;
    public const int MinPairs = 2;
    public const int MaxPairs = 10;
    public const int PairIdMaxLength = 50;
    public const int ConceptMaxLength = 200;
    public const int DefinitionMaxLength = 1000;

    public override string Key => "matching";

    protected override IReadOnlyList<string> Validate(MatchingContent content)
    {
        var errors = new List<string>();

        if (content.Instructions?.Trim().Length > InstructionsMaxLength)
        {
            errors.Add($"The instructions must be at most {InstructionsMaxLength} characters.");
        }

        var pairs = content.Pairs ?? [];
        if (pairs.Count is < MinPairs or > MaxPairs)
        {
            errors.Add($"A matching module must have between {MinPairs} and {MaxPairs} pairs.");
        }

        if (pairs.Any(p => string.IsNullOrWhiteSpace(p?.Id)))
        {
            errors.Add("Each pair must have an id.");
        }
        else if (pairs.Any(p => p!.Id!.Trim().Length > PairIdMaxLength))
        {
            errors.Add($"Pair ids must be at most {PairIdMaxLength} characters.");
        }
        else if (pairs.Select(p => p!.Id!.Trim()).Distinct().Count() != pairs.Count)
        {
            errors.Add("Pair ids must be unique.");
        }

        ValidateTexts(pairs.Select(p => p?.Concept).ToList(), "concept", ConceptMaxLength, errors);
        ValidateTexts(pairs.Select(p => p?.Definition).ToList(), "definition", DefinitionMaxLength, errors);

        return errors;
    }

    /// <summary>Each text is required, not too long, and unique ignoring case, so every match is unambiguous.</summary>
    private static void ValidateTexts(List<string?> texts, string name, int maxLength, List<string> errors)
    {
        if (texts.Any(string.IsNullOrWhiteSpace))
        {
            errors.Add($"Each pair must have a {name}.");
        }
        else if (texts.Any(text => text!.Trim().Length > maxLength))
        {
            errors.Add($"Each {name} must be at most {maxLength} characters.");
        }
        else if (texts.Select(text => text!.Trim()).Distinct(StringComparer.InvariantCultureIgnoreCase).Count() != texts.Count)
        {
            errors.Add($"Each {name} must be different.");
        }
    }

    protected override MatchingContent Normalize(MatchingContent content)
    {
        var instructions = content.Instructions?.Trim();
        return new MatchingContent(
            string.IsNullOrEmpty(instructions) ? null : instructions,
            content.Pairs!
                .Select(p => (MatchingPair?)new MatchingPair(p!.Id!.Trim(), p.Concept!.Trim(), p.Definition!.Trim()))
                .ToList());
    }
}
