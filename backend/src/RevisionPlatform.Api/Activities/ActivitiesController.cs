using Microsoft.AspNetCore.Mvc;

namespace RevisionPlatform.Api.Activities;

[ApiController]
[Route("api/activities")]
public class ActivitiesController(ActivityService activityService, ActivityValidator activityValidator)
    : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ActivityPageResponse>> GetPage([FromQuery] ActivityListRequest request)
    {
        var validation = ActivityListValidator.Validate(request);
        if (validation.Query is null)
        {
            return ValidationProblem(new ValidationProblemDetails(validation.Errors));
        }

        return Ok(await activityService.GetPageAsync(validation.Query));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ActivityResponse>> GetById(int id)
    {
        var activity = await activityService.GetByIdAsync(id);
        return activity is null ? NotFound() : Ok(activity);
    }

    [HttpPost]
    public async Task<ActionResult<ActivityResponse>> Create(CreateActivityRequest request)
    {
        var validation = activityValidator.Validate(request);
        if (validation.Activity is null)
        {
            return ValidationProblem(new ValidationProblemDetails(validation.Errors));
        }

        var activity = await activityService.CreateAsync(validation.Activity);
        return CreatedAtAction(nameof(GetById), new { id = activity.Id }, activity);
    }
}
