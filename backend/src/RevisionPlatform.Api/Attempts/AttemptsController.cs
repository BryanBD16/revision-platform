using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Shared;

namespace RevisionPlatform.Api.Attempts;

/// <summary>The results of the signed-in user. A user only ever sees their own attempts.</summary>
[ApiController]
[Route("api/attempts")]
[Authorize]
public class AttemptsController(AttemptService attemptService) : ControllerBase
{
    /// <summary>Saves a completed activity. Attempts cannot be changed or deleted afterwards.</summary>
    [HttpPost]
    public async Task<ActionResult<AttemptResponse>> Save(SaveAttemptRequest request)
    {
        var result = await attemptService.SaveAsync(request, User.GetUserId()!.Value);
        if (result.ActivityNotFound)
        {
            return NotFound();
        }
        if (result.Attempt is null)
        {
            return ValidationProblem(new ValidationProblemDetails(result.Errors));
        }

        return Created($"/api/attempts/{result.Attempt.Id}", result.Attempt);
    }

    /// <summary>The attempts of the signed-in user, newest first, optionally for one activity.</summary>
    [HttpGet]
    public async Task<ActionResult<AttemptPageResponse>> GetPage(int? page, int? pageSize, int? activityId)
    {
        var errors = new Dictionary<string, string[]>();
        var (validPage, validPageSize) = Paging.Validate(page, pageSize, errors);
        if (errors.Count > 0)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        return Ok(await attemptService.GetPageAsync(User.GetUserId()!.Value, activityId, validPage, validPageSize));
    }

    /// <summary>One attempt of the signed-in user; someone else's attempt returns 404.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AttemptResponse>> GetById(int id)
    {
        var attempt = await attemptService.GetByIdAsync(id, User.GetUserId()!.Value);
        return attempt is null ? NotFound() : Ok(attempt);
    }
}
