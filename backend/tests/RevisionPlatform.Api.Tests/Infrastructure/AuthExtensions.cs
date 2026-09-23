using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Users;

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

    /// <summary>Registers a new admin and signs the client in as that admin.</summary>
    public static async Task<CurrentUserResponse> RegisterAdminAsync(
        this HttpClient client, ApiFactory factory, string email = "admin@example.com", string displayName = "Admin")
    {
        var user = await client.RegisterAsync(email, displayName);
        await factory.AddToRoleAsync(email, RoleNames.Admin);
        return user;
    }

    /// <summary>Gives a role directly in the database, without the audit trail.</summary>
    public static async Task AddToRoleAsync(this ApiFactory factory, string email, string role)
    {
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var result = await users.AddToRoleAsync((await users.FindByEmailAsync(email))!, role);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join(" ", result.Errors.Select(e => e.Description)));
        }
    }
}
