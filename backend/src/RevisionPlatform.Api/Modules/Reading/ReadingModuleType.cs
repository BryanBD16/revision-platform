namespace RevisionPlatform.Api.Modules.Reading;

public class ReadingModuleType : ModuleType<ReadingContent>
{
    public const int TitleMaxLength = 200;
    public const int BodyMaxLength = 20000;

    public override string Key => "reading";

    protected override IReadOnlyList<string> Validate(ReadingContent content)
    {
        var errors = new List<string>();

        if (content.Title?.Trim().Length > TitleMaxLength)
        {
            errors.Add($"The title must be at most {TitleMaxLength} characters.");
        }

        var body = content.Body?.Trim();
        if (string.IsNullOrEmpty(body))
        {
            errors.Add("The text to read is required.");
        }
        else if (body.Length > BodyMaxLength)
        {
            errors.Add($"The text to read must be at most {BodyMaxLength} characters.");
        }

        return errors;
    }

    protected override ReadingContent Normalize(ReadingContent content)
    {
        var title = content.Title?.Trim();
        return new ReadingContent(string.IsNullOrEmpty(title) ? null : title, content.Body!.Trim());
    }
}
