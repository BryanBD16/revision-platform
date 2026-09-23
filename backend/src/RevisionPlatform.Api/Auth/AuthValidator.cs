using System.Net.Mail;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Auth;

/// <summary>A registration that passed validation, with its values trimmed.</summary>
public record ValidatedRegistration(string Email, string Password, string DisplayName);

public static class AuthValidator
{
    /// <summary>
    /// Checks the format of a registration. The password rules and the unique email are
    /// checked by ASP.NET Core Identity when the user is created.
    /// </summary>
    public static (ValidatedRegistration? Registration, Dictionary<string, string[]> Errors) ValidateRegistration(
        RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        var email = request.Email?.Trim();
        if (string.IsNullOrEmpty(email))
        {
            errors["email"] = ["The email is required."];
        }
        else if (email.Length > AppUser.EmailMaxLength || !IsEmailAddress(email))
        {
            errors["email"] = ["The email is not a valid email address."];
        }

        // Passwords are not trimmed: spaces are allowed and count.
        var password = request.Password;
        if (string.IsNullOrEmpty(password))
        {
            errors["password"] = ["The password is required."];
        }
        else if (password.Length > AuthServiceCollectionExtensions.PasswordMaxLength)
        {
            errors["password"] =
                [$"The password must be at most {AuthServiceCollectionExtensions.PasswordMaxLength} characters."];
        }

        var displayName = request.DisplayName?.Trim();
        if (string.IsNullOrEmpty(displayName))
        {
            errors["displayName"] = ["The display name is required."];
        }
        else if (displayName.Length > AppUser.DisplayNameMaxLength)
        {
            errors["displayName"] = [$"The display name must be at most {AppUser.DisplayNameMaxLength} characters."];
        }

        return errors.Count > 0
            ? (null, errors)
            : (new ValidatedRegistration(email!, password!, displayName!), errors);
    }

    /// <summary>Accepts a plain address such as "name@example.com", not "Name &lt;name@example.com&gt;".</summary>
    private static bool IsEmailAddress(string value) =>
        MailAddress.TryCreate(value, out var address) && address.Address == value;
}
