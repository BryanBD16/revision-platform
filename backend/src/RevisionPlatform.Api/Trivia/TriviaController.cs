using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Shared;

namespace RevisionPlatform.Api.Trivia;

/// <summary>The trivia game: anyone can play, but only signed-in users save their scores.</summary>
[ApiController]
[Route("api/trivia")]
public class TriviaController(TriviaService triviaService) : ControllerBase
{
    [HttpGet("themes")]
    public async Task<ActionResult<IReadOnlyList<TriviaThemeResponse>>> GetThemes()
    {
        return Ok(await triviaService.GetThemesAsync());
    }

    [HttpGet("questions")]
    public async Task<ActionResult<IReadOnlyList<TriviaQuestionResponse>>> GetQuestions(
        [FromQuery] List<int>? themeIds)
    {
        var errors = new Dictionary<string, string[]>();
        var validThemeIds = TriviaService.ValidateThemeIds(themeIds, errors);
        if (errors.Count > 0)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        return Ok(await triviaService.GetQuestionsAsync(validThemeIds));
    }

    /// <summary>The number of questions of the themes, so that players see it before starting.</summary>
    [HttpGet("questions/count")]
    public async Task<ActionResult<TriviaQuestionCountResponse>> CountQuestions([FromQuery] List<int>? themeIds)
    {
        var errors = new Dictionary<string, string[]>();
        var validThemeIds = TriviaService.ValidateThemeIds(themeIds, errors);
        if (errors.Count > 0)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        return Ok(new TriviaQuestionCountResponse(await triviaService.CountQuestionsAsync(validThemeIds)));
    }

    /// <summary>Saves a finished game. Scores cannot be changed or deleted afterwards.</summary>
    [Authorize]
    [HttpPost("scores")]
    public async Task<ActionResult<TriviaScoreResponse>> SaveScore(SaveTriviaScoreRequest request)
    {
        var result = await triviaService.SaveScoreAsync(request, User.GetUserId()!.Value);
        if (result.Score is null)
        {
            return ValidationProblem(new ValidationProblemDetails(result.Errors));
        }

        return StatusCode(StatusCodes.Status201Created, result.Score);
    }

    /// <summary>The scores of the signed-in user, newest first. A user only ever sees their own scores.</summary>
    [Authorize]
    [HttpGet("scores")]
    public async Task<ActionResult<TriviaScorePageResponse>> GetScores(int? page, int? pageSize)
    {
        var errors = new Dictionary<string, string[]>();
        var (validPage, validPageSize) = Paging.Validate(page, pageSize, errors);
        if (errors.Count > 0)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        return Ok(await triviaService.GetScoresPageAsync(User.GetUserId()!.Value, validPage, validPageSize));
    }
}
