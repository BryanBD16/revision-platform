using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace RevisionPlatform.Api.Auth;

/// <summary>
/// Rejects the requests that can change data (all but GET, HEAD, OPTIONS and TRACE)
/// without a valid anti-forgery token (see <see cref="XsrfCookie"/>).
/// </summary>
public class ValidateAntiforgeryFilter(IAntiforgery antiforgery) : IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var method = context.HttpContext.Request.Method;
        if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method)
            || HttpMethods.IsOptions(method) || HttpMethods.IsTrace(method))
        {
            return;
        }

        if (!await antiforgery.IsRequestValidAsync(context.HttpContext))
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "The anti-forgery token is missing or invalid. Reload the page and try again.",
            })
            { StatusCode = StatusCodes.Status400BadRequest };
        }
    }
}
