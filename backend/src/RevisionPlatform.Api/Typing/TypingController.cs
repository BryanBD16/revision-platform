using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Shared;

namespace RevisionPlatform.Api.Typing;

/// <summary>The typing test results: anyone can take a test, but only signed-in users save results.</summary>
[ApiController]
[Route("api/typing")]
[Authorize]
public class TypingController(TypingService typingService) : ControllerBase
{
    /// <summary>Saves a finished test. Results cannot be changed or deleted afterwards.</summary>
    [HttpPost("results")]
    public async Task<ActionResult<TypingResultResponse>> SaveResult(SaveTypingResultRequest request)
    {
        var result = await typingService.SaveResultAsync(request, User.GetUserId()!.Value);
        if (result.Result is null)
        {
            return ValidationProblem(new ValidationProblemDetails(result.Errors));
        }

        return StatusCode(StatusCodes.Status201Created, result.Result);
    }

    /// <summary>The results of the signed-in user, newest first. A user only ever sees their own results.</summary>
    [HttpGet("results")]
    public async Task<ActionResult<TypingResultPageResponse>> GetResults(int? page, int? pageSize)
    {
        var errors = new Dictionary<string, string[]>();
        var (validPage, validPageSize) = Paging.Validate(page, pageSize, errors);
        if (errors.Count > 0)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        return Ok(await typingService.GetResultsPageAsync(User.GetUserId()!.Value, validPage, validPageSize));
    }
}
