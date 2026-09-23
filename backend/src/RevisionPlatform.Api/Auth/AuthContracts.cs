namespace RevisionPlatform.Api.Auth;

// Request properties are nullable so that missing values reach AuthValidator
// instead of being rejected by the framework with a different error format.
public record RegisterRequest(string? Email, string? Password, string? DisplayName);

public record SignInRequest(string? Email, string? Password);

public record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

/// <summary>The signed-in user.</summary>
public record CurrentUserResponse(int Id, string Email, string DisplayName, IReadOnlyList<string> Roles);
