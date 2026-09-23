using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Auth;

namespace RevisionPlatform.Api.Themes;

/// <summary>Themes and courses are both stored as themes, but are listed separately.</summary>
[ApiController]
public class ThemesController(ThemeService themeService) : ControllerBase
{
    [HttpGet("api/themes")]
    public async Task<ActionResult<IReadOnlyList<ThemeResponse>>> GetThemes()
    {
        return Ok(await themeService.GetAllAsync(ThemeKind.Topic, User.GetUserId()));
    }

    [HttpGet("api/courses")]
    public async Task<ActionResult<IReadOnlyList<ThemeResponse>>> GetCourses()
    {
        return Ok(await themeService.GetAllAsync(ThemeKind.Course, User.GetUserId()));
    }
}
