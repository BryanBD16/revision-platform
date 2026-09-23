using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Tests.Infrastructure;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class RateLimitingTests(ApiFactory factory)
{
    [Fact]
    public async Task PasswordEndpoints_RejectTooManyRequestsFromTheSameAddress()
    {
        using var limited = factory.WithWebHostBuilder(builder =>
            builder.UseSetting("RateLimiting:PasswordRequestsPerMinute", "3"));
        var client = ApiFactory.CreateApiClient(limited);
        var request = new SignInRequest("nobody@example.com", "wrong password!");

        var statuses = new List<HttpStatusCode>();
        for (var attempt = 0; attempt < 4; attempt++)
        {
            statuses.Add((await client.PostAsJsonAsync("/api/auth/sign-in", request)).StatusCode);
        }

        Assert.Equal(
            [HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized, HttpStatusCode.TooManyRequests],
            statuses);
    }
}
