using System.Net.Http.Json;
using RevisionPlatform.Api.Auth;

namespace RevisionPlatform.Api.Tests.Infrastructure;

public static class AuthExtensions
{
    public const string Password = "correct horse battery";

    /// <summary>Registers a new user, which also signs the client in as that user.</summary>
    public static async Task<CurrentUserResponse> RegisterAsync(
        this HttpClient client, string email = "ada@example.com", string displayName = "Ada")
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, Password, displayName));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CurrentUserResponse>())!;
    }
}
