namespace RevisionPlatform.Api.Activities;

/// <summary>
/// Who can see an activity. A private activity is seen only by its owner; a public
/// activity is seen by everyone, including visitors, and has no owner.
/// </summary>
public static class ActivityVisibility
{
    public const string Private = "private";
    public const string Public = "public";

    public static readonly IReadOnlyList<string> All = [Private, Public];

    /// <summary>The activities that the user <paramref name="viewerId"/> (null for a visitor) can see.</summary>
    public static IQueryable<RevisionActivity> VisibleTo(this IQueryable<RevisionActivity> activities, int? viewerId) =>
        activities.Where(a => a.Visibility == Public || (viewerId != null && a.OwnerId == viewerId));
}
