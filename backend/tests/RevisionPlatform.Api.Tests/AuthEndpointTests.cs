using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Tests.Infrastructure;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class AuthEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateApiClient();

    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Me_ReturnsNoContentWhenNobodyIsSignedIn()
    {
        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Register_CreatesTheUserAndSignsItIn()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("  ada@example.com ", AuthExtensions.Password, "  Ada Lovelace "));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<CurrentUserResponse>();
        Assert.Equal("ada@example.com", user!.Email);
        Assert.Equal("Ada Lovelace", user.DisplayName);
        Assert.Empty(user.Roles);
        Assert.Empty(user.Permissions);
        Assert.Equivalent(user, await MeAsync(_client), strict: true);
    }

    [Fact]
    public async Task Register_SetsASecureSessionCookie()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("ada@example.com", AuthExtensions.Password, "Ada"));

        var session = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("revision_session="));
        Assert.Contains("httponly", session, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", session, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_RejectsATakenEmailIgnoringCase()
    {
        await _client.RegisterAsync("ada@example.com");

        var response = await factory.CreateApiClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("ADA@example.com", AuthExtensions.Password, "Another Ada"));

        var problem = await AssertValidationProblemAsync(response, "email");
        Assert.Equal(["An account already exists with this email."], problem.Errors["email"]);
    }

    public static TheoryData<RegisterRequest, string> InvalidRegistrations => new()
    {
        { new RegisterRequest(null, AuthExtensions.Password, "Ada"), "email" },
        { new RegisterRequest("not an email", AuthExtensions.Password, "Ada"), "email" },
        { new RegisterRequest("Ada <ada@example.com>", AuthExtensions.Password, "Ada"), "email" },
        { new RegisterRequest(new string('a', 245) + "@example.com", AuthExtensions.Password, "Ada"), "email" },
        { new RegisterRequest("ada@example.com", null, "Ada"), "password" },
        { new RegisterRequest("ada@example.com", "elevenchars", "Ada"), "password" },
        { new RegisterRequest("ada@example.com", new string('p', 129), "Ada"), "password" },
        { new RegisterRequest("ada@example.com", AuthExtensions.Password, "  "), "displayName" },
        { new RegisterRequest("ada@example.com", AuthExtensions.Password, new string('n', 101)), "displayName" },
    };

    [Theory]
    [MemberData(nameof(InvalidRegistrations))]
    public async Task Register_RejectsInvalidRequest(RegisterRequest request, string invalidField)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        await AssertValidationProblemAsync(response, invalidField);
        Assert.Null(await MeAsync(_client));
    }

    [Fact]
    public async Task Register_AcceptsAPasswordOfTwelveCharactersWithoutSymbolsOrDigits()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("ada@example.com", "twelve chars", "Ada"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_SignsInWithTheRightPasswordIgnoringEmailCase()
    {
        var registered = await factory.CreateApiClient().RegisterAsync("ada@example.com");

        var response = await SignInAsync(_client, " ADA@example.com ", AuthExtensions.Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equivalent(registered, await MeAsync(_client), strict: true);
    }

    [Fact]
    public async Task SignIn_GivesTheSameAnswerForAWrongPasswordAndAnUnknownEmail()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com");

        var wrongPassword = await SignInAsync(_client, "ada@example.com", "wrong password!");
        var unknownEmail = await SignInAsync(_client, "grace@example.com", AuthExtensions.Password);

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownEmail.StatusCode);
        Assert.Equal(await TitleAsync(wrongPassword), await TitleAsync(unknownEmail));
        Assert.Null(await MeAsync(_client));
    }

    [Fact]
    public async Task SignIn_LocksTheAccountAfterFiveFailedAttempts()
    {
        await factory.CreateApiClient().RegisterAsync("ada@example.com");
        for (var attempt = 0; attempt < 5; attempt++)
        {
            await SignInAsync(_client, "ada@example.com", "wrong password!");
        }

        var response = await SignInAsync(_client, "ada@example.com", AuthExtensions.Password);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("Too many failed attempts", await TitleAsync(response));
        Assert.Null(await MeAsync(_client));
    }

    [Fact]
    public async Task SignOut_EndsTheSession()
    {
        await _client.RegisterAsync();

        var response = await _client.PostAsync("/api/auth/sign-out", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Null(await MeAsync(_client));
    }

    [Fact]
    public async Task ChangePassword_ReplacesThePasswordAndKeepsThisSessionOnly()
    {
        await _client.RegisterAsync("ada@example.com");
        var otherSession = factory.CreateApiClient();
        await SignInAsync(otherSession, "ada@example.com", AuthExtensions.Password);

        var response = await _client.PostAsJsonAsync("/api/auth/change-password",
            new ChangePasswordRequest(AuthExtensions.Password, "a brand new password"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.NotNull(await MeAsync(_client));
        Assert.Null(await MeAsync(otherSession));
        var client = factory.CreateApiClient();
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await SignInAsync(client, "ada@example.com", AuthExtensions.Password)).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await SignInAsync(client, "ada@example.com", "a brand new password")).StatusCode);
    }

    [Theory]
    [InlineData("wrong password!", "a brand new password", "currentPassword")]
    [InlineData("", "a brand new password", "currentPassword")]
    [InlineData(AuthExtensions.Password, "too short", "newPassword")]
    [InlineData(AuthExtensions.Password, "", "newPassword")]
    public async Task ChangePassword_RejectsInvalidRequest(string current, string newPassword, string invalidField)
    {
        await _client.RegisterAsync();

        var response = await _client.PostAsJsonAsync("/api/auth/change-password",
            new ChangePasswordRequest(current, newPassword));

        await AssertValidationProblemAsync(response, invalidField);
    }

    [Fact]
    public async Task ChangePassword_RequiresASignedInUser()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/change-password",
            new ChangePasswordRequest(AuthExtensions.Password, "a brand new password"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Requests_WithoutTheAntiforgeryTokenAreRejected()
    {
        // A client without the XsrfHandler, like a form posted from another site.
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("ada@example.com", AuthExtensions.Password, "Ada"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("anti-forgery", await TitleAsync(response));
    }

    [Fact]
    public async Task Requests_WithATokenIssuedBeforeSigningInAreRejected()
    {
        // A client that keeps cookies but sends the anti-forgery header by hand.
        var cookies = new CookieContainer();
        var client = factory.CreateDefaultClient(new CookieContainerHandler(cookies));
        await client.GetAsync("/api/auth/me");
        var anonymousToken = cookies.GetCookies(client.BaseAddress!)[XsrfCookie.CookieName]!.Value;
        var register = await PostWithTokenAsync(client, "/api/auth/register",
            new RegisterRequest("ada@example.com", AuthExtensions.Password, "Ada"), anonymousToken);
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);

        var signOut = await PostWithTokenAsync(client, "/api/auth/sign-out", new { }, anonymousToken);

        Assert.Equal(HttpStatusCode.BadRequest, signOut.StatusCode);
        Assert.NotNull(await MeAsync(client));
    }

    private static Task<HttpResponseMessage> PostWithTokenAsync(HttpClient client, string url, object body, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        request.Headers.Add(XsrfCookie.HeaderName, token);
        return client.SendAsync(request);
    }

    private static Task<HttpResponseMessage> SignInAsync(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest(email, password));

    private static async Task<CurrentUserResponse?> MeAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/auth/me");
        return response.StatusCode == HttpStatusCode.NoContent
            ? null
            : await response.Content.ReadFromJsonAsync<CurrentUserResponse>();
    }

    private static async Task<string> TitleAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<ProblemDetails>())!.Title!;

    private static async Task<ValidationProblemDetails> AssertValidationProblemAsync(
        HttpResponseMessage response, string invalidField)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal([invalidField], problem!.Errors.Keys);
        return problem;
    }
}
