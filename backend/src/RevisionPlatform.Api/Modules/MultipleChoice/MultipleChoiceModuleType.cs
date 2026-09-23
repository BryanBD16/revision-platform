namespace RevisionPlatform.Api.Modules.MultipleChoice;

public class MultipleChoiceModuleType : ModuleType<MultipleChoiceContent>
{
    public const int QuestionMaxLength = 1000;
    public const int MinChoices = 2;
    public const int MaxChoices = 10;
    public const int ChoiceIdMaxLength = 50;
    public const int ChoiceTextMaxLength = 500;
    public const int ExplanationMaxLength = 2000;

    public override string Key => "multiple-choice";

    protected override IReadOnlyList<string> Validate(MultipleChoiceContent content)
    {
        var errors = new List<string>();

        var question = content.Question?.Trim();
        if (string.IsNullOrEmpty(question))
        {
            errors.Add("The question is required.");
        }
        else if (question.Length > QuestionMaxLength)
        {
            errors.Add($"The question must be at most {QuestionMaxLength} characters.");
        }

        var choices = content.Choices ?? [];
        if (choices.Count is < MinChoices or > MaxChoices)
        {
            errors.Add($"A question must have between {MinChoices} and {MaxChoices} choices.");
        }

        if (choices.Any(c => string.IsNullOrWhiteSpace(c?.Id)))
        {
            errors.Add("Each choice must have an id.");
        }
        else if (choices.Any(c => c!.Id!.Trim().Length > ChoiceIdMaxLength))
        {
            errors.Add($"Choice ids must be at most {ChoiceIdMaxLength} characters.");
        }
        else if (choices.Select(c => c!.Id!.Trim()).Distinct().Count() != choices.Count)
        {
            errors.Add("Choice ids must be unique.");
        }

        if (choices.Any(c => string.IsNullOrWhiteSpace(c?.Text)))
        {
            errors.Add("Each choice must have a text.");
        }
        else if (choices.Any(c => c!.Text!.Trim().Length > ChoiceTextMaxLength))
        {
            errors.Add($"Choice texts must be at most {ChoiceTextMaxLength} characters.");
        }

        var choiceIds = choices.Select(c => c?.Id?.Trim()).ToHashSet();
        var correctIds = content.CorrectChoiceIds ?? [];
        if (correctIds.Count == 0)
        {
            errors.Add("At least one choice must be marked as correct.");
        }
        else if (correctIds.Any(id => id is null || !choiceIds.Contains(id.Trim())))
        {
            errors.Add("The correct answers must be choices of the question.");
        }

        if (content.Explanation?.Trim().Length > ExplanationMaxLength)
        {
            errors.Add($"The explanation must be at most {ExplanationMaxLength} characters.");
        }

        return errors;
    }

    protected override MultipleChoiceContent Normalize(MultipleChoiceContent content)
    {
        var choices = content.Choices!.Select(c => new Choice(c!.Id!.Trim(), c.Text!.Trim())).ToList();
        var correctIds = content.CorrectChoiceIds!.Select(id => id!.Trim()).ToHashSet();
        var explanation = content.Explanation?.Trim();

        return new MultipleChoiceContent(
            content.Question!.Trim(),
            choices!,
            // Without duplicates, in the order of the choices.
            choices.Where(c => correctIds.Contains(c.Id!)).Select(c => c.Id).ToList(),
            string.IsNullOrEmpty(explanation) ? null : explanation);
    }
}
