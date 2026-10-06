using Microsoft.AspNetCore.Mvc;

namespace RevisionPlatform.Api.Trivia;

/// <summary>The trivia game: anyone can play, visitors included.</summary>
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
}
