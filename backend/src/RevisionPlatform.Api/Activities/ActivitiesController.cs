using Microsoft.AspNetCore.Mvc;

namespace RevisionPlatform.Api.Activities;

[ApiController]
[Route("api/activities")]
public class ActivitiesController(ActivityService activityService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ActivityResponse>>> GetAll()
    {
        return Ok(await activityService.GetAllAsync());
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
        var errors = ActivityValidator.Validate(request);
        if (errors.Count > 0)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        var activity = await activityService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = activity.Id }, activity);
    }
}
