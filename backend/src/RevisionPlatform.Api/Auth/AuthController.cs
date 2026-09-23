using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<AppUser> userManager,
    SignInManager<AppUser> signInManager,
    IAntiforgery antiforgery) : ControllerBase
{
    private const string InvalidCredentials = "The email or the password is incorrect.";

    /// <summary>Creates an account and signs the new user in.</summary>
    [HttpPost("register")]
    [EnableRateLimiting(AuthServiceCollectionExtensions.PasswordRateLimitPolicy)]
    public async Task<ActionResult<CurrentUserResponse>> Register(RegisterRequest request)
    {
        var (registration, errors) = AuthValidator.ValidateRegistration(request);
        if (registration is null)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        var user = new AppUser
        {
            UserName = registration.Email,
            Email = registration.Email,
            DisplayName = registration.DisplayName,
            CreatedAt = DateTime.UtcNow,
        };
        var result = await userManager.CreateAsync(user, registration.Password);
        if (!result.Succeeded)
        {
            return ValidationProblem(new ValidationProblemDetails(ToFieldErrors(result.Errors)));
        }

        await SignInAsync(user);
        return Created("/api/auth/me", await ToResponseAsync(user));
    }

    [HttpPost("sign-in")]
    [EnableRateLimiting(AuthServiceCollectionExtensions.PasswordRateLimitPolicy)]
    public async Task<ActionResult<CurrentUserResponse>> SignIn(SignInRequest request)
    {
        // The same answer for an unknown email and a wrong password, so that the
        // response does not tell whether an account exists.
        var user = string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password)
            ? null
            : await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: InvalidCredentials);
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password!, lockoutOnFailure: true);
        if (result.IsLockedOut)
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Too many failed attempts. Try again in 15 minutes.");
        }
        if (!result.Succeeded)
        {
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: InvalidCredentials);
        }

        await SignInAsync(user);
        return Ok(await ToResponseAsync(user));
    }

    [HttpPost("sign-out")]
    public async Task<IActionResult> SignOutUser()
    {
        await signInManager.SignOutAsync();
        HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        XsrfCookie.Issue(HttpContext, antiforgery);
        return NoContent();
    }

    /// <summary>
    /// Changes the password of the signed-in user. The other sessions of the user are
    /// signed out; this one stays signed in.
    /// </summary>
    [Authorize]
    [HttpPost("change-password")]
    [EnableRateLimiting(AuthServiceCollectionExtensions.PasswordRateLimitPolicy)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrEmpty(request.CurrentPassword))
        {
            errors["currentPassword"] = ["The current password is required."];
        }
        if (string.IsNullOrEmpty(request.NewPassword))
        {
            errors["newPassword"] = ["The new password is required."];
        }
        else if (request.NewPassword.Length > AuthServiceCollectionExtensions.PasswordMaxLength)
        {
            errors["newPassword"] =
                [$"The password must be at most {AuthServiceCollectionExtensions.PasswordMaxLength} characters."];
        }
        if (errors.Count > 0)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        var user = (await userManager.GetUserAsync(User))!;
        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword!, request.NewPassword!);
        if (!result.Succeeded)
        {
            var fieldErrors = result.Errors
                .GroupBy(e => e.Code == "PasswordMismatch" ? "currentPassword" : "newPassword",
                    e => e.Code == "PasswordMismatch" ? "The current password is incorrect." : e.Description)
                .ToDictionary(group => group.Key, group => group.ToArray());
            return ValidationProblem(new ValidationProblemDetails(fieldErrors));
        }

        // Changing the password changes the security stamp, which ends every session:
        // sign this one in again.
        await SignInAsync(user);
        return NoContent();
    }

    /// <summary>Returns the signed-in user, or 204 when nobody is signed in.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me()
    {
        var user = await userManager.GetUserAsync(User);
        return user is null ? NoContent() : Ok(await ToResponseAsync(user));
    }

    private async Task SignInAsync(AppUser user)
    {
        await signInManager.SignInAsync(user, isPersistent: true);
        // The anti-forgery token is tied to the user: send one for the signed-in user.
        HttpContext.User = await signInManager.CreateUserPrincipalAsync(user);
        XsrfCookie.Issue(HttpContext, antiforgery);
    }

    private async Task<CurrentUserResponse> ToResponseAsync(AppUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        return new CurrentUserResponse(user.Id, user.Email!, user.DisplayName, roles.Order().ToList());
    }

    /// <summary>Converts the errors of Identity to validation errors keyed by field.</summary>
    private static Dictionary<string, string[]> ToFieldErrors(IEnumerable<IdentityError> errors) => errors
        .Select(error => error.Code switch
        {
            // The email is also the user name, so both errors are reported for a taken email.
            "DuplicateUserName" or "DuplicateEmail" => ("email", "An account already exists with this email."),
            _ when error.Code.StartsWith("Password") => ("password", error.Description),
            _ => ("email", error.Description),
        })
        .GroupBy(error => error.Item1, error => error.Item2)
        .ToDictionary(group => group.Key, group => group.Distinct().ToArray());
}
