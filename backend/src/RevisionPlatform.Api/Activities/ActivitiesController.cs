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
        var activity = await activityService.GetByIdAsync(id, User.GetUserId(), await CanManagePublicAsync());
        return activity is null ? NotFound() : Ok(activity);
    }

    /// <summary>Creates an activity: private by default, public only for the users allowed to publish.</summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ActivityResponse>> Create(SaveActivityRequest request)
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

        var id = await activityService.CreateAsync(validation.Activity, User.GetUserId());
        var activity = await activityService.GetByIdAsync(id, User.GetUserId(), await CanManagePublicAsync());
        return CreatedAtAction(nameof(GetById), new { id }, activity);
    }

    /// <summary>Replaces an activity: its owner can edit it, and admins can edit public activities.</summary>
    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ActivityResponse>> Update(int id, SaveActivityRequest request)
    {
        var validation = activityValidator.Validate(request, isUpdate: true);
        if (validation.Activity is null)
        {
            return ValidationProblem(new ValidationProblemDetails(validation.Errors));
        }

        var permissions = await PermissionsAsync();
        var result = await activityService.UpdateAsync(id, validation.Activity, User.GetUserId()!.Value, permissions);
        if (result.Status != ActivityChangeStatus.Done)
        {
            return ToErrorResult(result);
        }

        return Ok(await activityService.GetByIdAsync(id, User.GetUserId(), permissions.CanManagePublic));
    }

    /// <summary>Deletes an activity for good: its owner can delete it, and admins can delete public activities.</summary>
    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await activityService.DeleteAsync(id, User.GetUserId()!.Value, await PermissionsAsync());
        return result.Status == ActivityChangeStatus.Done ? NoContent() : ToErrorResult(result);
    }

    private ActionResult ToErrorResult(ActivityChangeResult result) => result.Status switch
    {
        ActivityChangeStatus.NotFound => NotFound(),
        ActivityChangeStatus.Forbidden => Problem(statusCode: StatusCodes.Status403Forbidden, title: result.Message),
        _ => ValidationProblem(new ValidationProblemDetails(result.Errors!)),
    };

    private async Task<ActivityPermissions> PermissionsAsync() => new(
        (await authorizationService.AuthorizeAsync(User, Policies.PublishActivities)).Succeeded,
        await CanManagePublicAsync());

    private async Task<bool> CanManagePublicAsync() =>
        (await authorizationService.AuthorizeAsync(User, Policies.ManagePublicActivities)).Succeeded;
}
