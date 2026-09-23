using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Auth;

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
}
