using Microsoft.AspNetCore.Antiforgery;

namespace RevisionPlatform.Api.Auth;

/// <summary>
/// Protection against cross-site request forgery. The API sends an anti-forgery token
/// in a cookie that JavaScript can read; Angular's HttpClient copies it into a header
/// of every POST, PUT and DELETE request, and the API checks it. Another site can
/// neither read the cookie nor set the header.
/// </summary>
public static class XsrfCookie
{
    public const string CookieName = "XSRF-TOKEN";
    public const string HeaderName = "X-XSRF-TOKEN";

    /// <summary>
    /// Sends a token for the user of <paramref name="context"/>. A token is only valid for
    /// the user it was created for, so a new one is sent after signing in or out.
    /// </summary>
    public static void Issue(HttpContext context, IAntiforgery antiforgery)
    {
        var tokens = antiforgery.GetAndStoreTokens(context);
        context.Response.Cookies.Append(CookieName, tokens.RequestToken!, new CookieOptions
        {
            HttpOnly = false,
            SameSite = SameSiteMode.Strict,
            Secure = context.Request.IsHttps,
        });
    }

    /// <summary>Sends a token with every GET request of the API, for example GET /api/auth/me.</summary>
    public static IApplicationBuilder UseXsrfCookie(this IApplicationBuilder app)
    {
        var antiforgery = app.ApplicationServices.GetRequiredService<IAntiforgery>();
        return app.Use(async (context, next) =>
        {
            if (HttpMethods.IsGet(context.Request.Method) && context.Request.Path.StartsWithSegments("/api"))
            {
                Issue(context, antiforgery);
            }
            await next();
        });
    }
}
