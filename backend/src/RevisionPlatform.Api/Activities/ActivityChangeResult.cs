namespace RevisionPlatform.Api.Activities;

/// <summary>What the caller may do with activities, from its permissions (see Policies).</summary>
public record ActivityPermissions(bool CanPublish, bool CanManagePublic);

public enum ActivityChangeStatus
{
    Done,

    /// <summary>The activity does not exist, or it is another user's private activity.</summary>
    NotFound,

    /// <summary>The caller can see the activity but is not allowed to make this change.</summary>
    Forbidden,

    /// <summary>The request does not fit the activity, for example a module of another activity.</summary>
    Invalid,
}

/// <summary>The result of updating or deleting an activity.</summary>
public record ActivityChangeResult(
    ActivityChangeStatus Status,
    string? Message = null,
    Dictionary<string, string[]>? Errors = null)
{
    public static readonly ActivityChangeResult Done = new(ActivityChangeStatus.Done);
    public static readonly ActivityChangeResult NotFound = new(ActivityChangeStatus.NotFound);

    public static ActivityChangeResult Forbidden(string message) => new(ActivityChangeStatus.Forbidden, message);

    public static ActivityChangeResult Invalid(Dictionary<string, string[]> errors) =>
        new(ActivityChangeStatus.Invalid, Errors: errors);
}
