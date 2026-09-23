using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Commands;

/// <summary>
/// Commands for people with access to the server, run with
/// <c>dotnet run -- users &lt;command&gt;</c> (see the Makefile). They are never exposed
/// over HTTP. They create the first admin and reset forgotten passwords; after that,
/// admins manage the roles in the application.
/// </summary>
public static class UserCommands
{
    public const string Name = "users";

    private const string Usage = """
        Usage: users <command> [--yes]
          list                          List the users and their roles.
          grant-role <email> <role>     Give a role to a user.
          revoke-role <email> <role>    Remove a role from a user.
          reset-password <email>        Replace the password with a temporary one.
        --yes skips the confirmation.
        """;

    /// <summary>Runs a command and returns the process exit code (0 when it succeeded).</summary>
    public static async Task<int> RunAsync(IServiceProvider services, string[] args, TextReader input, TextWriter output)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;
        var confirmed = args.Contains("--yes");
        var arguments = args.Where(arg => arg != "--yes").ToArray();

        var context = new CommandContext(
            provider.GetRequiredService<AppDbContext>(),
            provider.GetRequiredService<UserManager<AppUser>>(),
            provider.GetRequiredService<RoleService>(),
            input,
            output,
            confirmed);

        switch (arguments)
        {
            case ["list"]:
                return await ListAsync(context);
            case ["grant-role", var email, var role]:
                return await ChangeRoleAsync(context, email, role, grant: true);
            case ["revoke-role", var email, var role]:
                return await ChangeRoleAsync(context, email, role, grant: false);
            case ["reset-password", var email]:
                return await ResetPasswordAsync(context, email);
            default:
                output.WriteLine(Usage);
                return 1;
        }
    }

    private record CommandContext(
        AppDbContext Db,
        UserManager<AppUser> Users,
        RoleService Roles,
        TextReader Input,
        TextWriter Output,
        bool Confirmed);

    private static async Task<int> ListAsync(CommandContext context)
    {
        var users = await context.Db.Users.OrderBy(u => u.Email).ToListAsync();
        if (users.Count == 0)
        {
            context.Output.WriteLine("There are no users.");
        }
        foreach (var user in users)
        {
            await DescribeAsync(context, user);
            context.Output.WriteLine();
        }
        return 0;
    }

    private static async Task<int> ChangeRoleAsync(CommandContext context, string email, string role, bool grant)
    {
        var user = await FindUserAsync(context, email);
        if (user is null)
        {
            return 1;
        }

        await DescribeAsync(context, user);
        var question = grant ? $"Give the role '{role}' to this user?" : $"Remove the role '{role}' from this user?";
        if (!Confirm(context, question))
        {
            return 1;
        }

        var error = grant
            ? await context.Roles.GrantAsync(user, role, changedBy: null, Origin())
            : await context.Roles.RevokeAsync(user, role, changedBy: null, Origin());
        if (error is not null)
        {
            context.Output.WriteLine($"Error: {error.Message}");
            return 1;
        }

        context.Output.WriteLine(grant ? $"The role '{role}' was given." : $"The role '{role}' was removed.");
        return 0;
    }

    /// <summary>
    /// Replaces the password with a random temporary one, unlocks the account and signs
    /// out all the sessions of the user. The user then changes it on the Account page.
    /// </summary>
    private static async Task<int> ResetPasswordAsync(CommandContext context, string email)
    {
        var user = await FindUserAsync(context, email);
        if (user is null)
        {
            return 1;
        }

        await DescribeAsync(context, user);
        if (!Confirm(context, "Replace the password of this user with a temporary password?"))
        {
            return 1;
        }

        // 18 random bytes give 24 characters, far above the minimum length.
        var password = Convert.ToBase64String(RandomNumberGenerator.GetBytes(18)).Replace('+', '-').Replace('/', '_');

        await using var transaction = await context.Db.Database.BeginTransactionAsync();
        await context.Users.RemovePasswordAsync(user);
        var result = await context.Users.AddPasswordAsync(user, password);
        if (!result.Succeeded)
        {
            context.Output.WriteLine($"Error: {string.Join(" ", result.Errors.Select(e => e.Description))}");
            return 1;
        }
        await context.Users.SetLockoutEndDateAsync(user, null);
        await context.Users.ResetAccessFailedCountAsync(user);
        await transaction.CommitAsync();

        context.Output.WriteLine($"Temporary password: {password}");
        context.Output.WriteLine(
            "Give it to the user privately. They should change it on the Account page after signing in.");
        return 0;
    }

    private static async Task<AppUser?> FindUserAsync(CommandContext context, string email)
    {
        var user = await context.Users.FindByEmailAsync(email.Trim());
        if (user is null)
        {
            context.Output.WriteLine($"Error: no user has the email '{email}'.");
        }
        return user;
    }

    /// <summary>Shows the account, so that the person running the command can check it is the right one.</summary>
    private static async Task DescribeAsync(CommandContext context, AppUser user)
    {
        var roles = await context.Users.GetRolesAsync(user);
        context.Output.WriteLine($"User:    {user.DisplayName} <{user.Email}> (id {user.Id})");
        context.Output.WriteLine($"Created: {user.CreatedAt:yyyy-MM-dd HH:mm} UTC");
        context.Output.WriteLine($"Roles:   {(roles.Count == 0 ? "none" : string.Join(", ", roles.Order()))}");
    }

    private static bool Confirm(CommandContext context, string question)
    {
        if (context.Confirmed)
        {
            return true;
        }
        context.Output.Write($"{question} Type 'yes' to confirm: ");
        if (context.Input.ReadLine()?.Trim() == "yes")
        {
            return true;
        }
        context.Output.WriteLine("Cancelled.");
        return false;
    }

    /// <summary>Recorded in the audit trail: who ran the command, on which machine.</summary>
    private static string Origin()
    {
        var origin = $"command line ({Environment.UserName}@{Environment.MachineName})";
        return origin.Length > RoleChange.OriginMaxLength ? origin[..RoleChange.OriginMaxLength] : origin;
    }
}
