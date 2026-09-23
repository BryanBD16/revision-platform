using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Auth;

namespace RevisionPlatform.Api.Activities;

[ApiController]
[Route("api/activities")]
public class ActivitiesController(
    ActivityService activityService,
    ActivityValidator activityValidator,
    IAuthorizationService authorizationService) : ControllerBase
{
    // The parameters are bound one by one so that binding errors are keyed by parameter name.
    [HttpGet]
    public async Task<ActionResult<ActivityPageResponse>> GetPage(
        int? page, int? pageSize, string? title, int? courseId, [FromQuery] List<int>? themeIds, string? visibility)
    {
        var validation = ActivityListValidator.Validate(
            new ActivityListRequest(page, pageSize, title, courseId, themeIds, visibility));
        if (validation.Query is null)
        {
            return ValidationProblem(new ValidationProblemDetails(validation.Errors));
        }

        return Ok(await activityService.GetPageAsync(validation.Query, User.GetUserId()));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ActivityResponse>> GetById(int id)
    {
        // Someone else's private activity also returns 404, so its existence is not revealed.
        var activity = await activityService.GetByIdAsync(id, User.GetUserId());
        return activity is null ? NotFound() : Ok(activity);
    }

    /// <summary>Creates an activity: private by default, public only for the users allowed to publish.</summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ActivityResponse>> Create(CreateActivityRequest request)
    {
        var validation = activityValidator.Validate(request);
        if (validation.Activity is null)
        {
            return ValidationProblem(new ValidationProblemDetails(validation.Errors));
        }

        if (validation.Activity.Visibility == ActivityVisibility.Public
            && !(await authorizationService.AuthorizeAsync(User, Policies.PublishActivities)).Succeeded)
        {
            return Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Only admins can create public activities.");
        }

        var activity = await activityService.CreateAsync(validation.Activity, User.GetUserId());
        return CreatedAtAction(nameof(GetById), new { id = activity.Id }, activity);
    }
}
