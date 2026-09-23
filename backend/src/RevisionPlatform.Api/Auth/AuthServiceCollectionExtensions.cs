using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Auth;

public static class AuthServiceCollectionExtensions
{
    public const int PasswordMinLength = 12;
    public const int PasswordMaxLength = 128;

    /// <summary>The rate limiting policy of the endpoints that take a password.</summary>
    public const string PasswordRateLimitPolicy = "password";

    /// <summary>
    /// Registers ASP.NET Core Identity with a session cookie, the anti-forgery tokens
    /// and the rate limiting of the endpoints that take a password.
    /// </summary>
    public static IServiceCollection AddAppAuthentication(
        this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services
            .AddIdentityCore<AppUser>(options =>
            {
                // The email is the user name, and it is validated as an email address.
                options.User.RequireUniqueEmail = true;
                options.User.AllowedUserNameCharacters = "";

                // Length matters more than character classes (NIST SP 800-63B).
                options.Password.RequiredLength = PasswordMinLength;
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;

                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<IdentityRole<int>>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddSignInManager();

        services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.Name = "revision_session";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Strict;
            // Development runs on plain HTTP; everywhere else the cookie is only sent over HTTPS.
            options.Cookie.SecurePolicy = environment.IsDevelopment()
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromDays(14);
            options.SlidingExpiration = true;

            // This is an API: answer with a status code instead of redirecting to a login page.
            options.Events.OnRedirectToLogin = context => SetStatus(context, StatusCodes.Status401Unauthorized);
            options.Events.OnRedirectToAccessDenied = context => SetStatus(context, StatusCodes.Status403Forbidden);
        });

        // Check the user against the database on every request, so that a role change,
        // a password reset or a locked account applies immediately.
        services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.Zero);

        services.AddAuthorization();

        services.AddAntiforgery(options =>
        {
            options.HeaderName = XsrfCookie.HeaderName;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = environment.IsDevelopment()
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;
        });

        var permitLimit = configuration.GetValue("RateLimiting:PasswordRequestsPerMinute", 10);
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(PasswordRateLimitPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = permitLimit, Window = TimeSpan.FromMinutes(1) }));
        });

        return services;
    }

    private static Task SetStatus(RedirectContext<CookieAuthenticationOptions> context, int statusCode)
    {
        context.Response.StatusCode = statusCode;
        return Task.CompletedTask;
    }
}
