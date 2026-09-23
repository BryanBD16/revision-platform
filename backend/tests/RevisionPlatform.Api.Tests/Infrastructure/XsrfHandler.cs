using System.Net;
using RevisionPlatform.Api.Auth;

namespace RevisionPlatform.Api.Tests.Infrastructure;

/// <summary>
/// Does what Angular's HttpClient does in the browser: copies the anti-forgery token
/// of the XSRF-TOKEN cookie into the X-XSRF-TOKEN header of POST, PUT and DELETE
/// requests. Without a token yet, it first sends GET /api/auth/me to receive one.
/// </summary>
public class XsrfHandler(CookieContainer cookies) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.Method != HttpMethod.Get && request.Method != HttpMethod.Head)
        {
            var token = Token(request.RequestUri!);
            if (token is null)
            {
                var uri = new Uri(request.RequestUri!, "/api/auth/me");
                (await base.SendAsync(new HttpRequestMessage(HttpMethod.Get, uri), cancellationToken)).Dispose();
                token = Token(request.RequestUri!);
            }
            request.Headers.Add(XsrfCookie.HeaderName, token);
        }

        return await base.SendAsync(request, cancellationToken);
    }

    private string? Token(Uri uri) => cookies.GetCookies(uri)[XsrfCookie.CookieName]?.Value;
}
