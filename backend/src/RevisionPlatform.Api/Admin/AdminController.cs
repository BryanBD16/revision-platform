using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Shared;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Admin;

/// <summary>User and role management, for the users allowed to manage roles.</summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = Policies.ManageRoles)]
public class AdminController(AdminService adminService, RoleService roleService, UserManager<AppUser> userManager)
    : ControllerBase
{
    /// <summary>Where the changes made with these endpoints come from, in the audit trail.</summary>
    public const string Origin = "admin page";

    [HttpGet("users")]
    public async Task<ActionResult<AdminUserPageResponse>> GetUsers(int? page, int? pageSize, string? search)
    {
        var errors = new Dictionary<string, string[]>();
        var (validPage, validPageSize) = Paging.Validate(page, pageSize, errors);
        search = search?.Trim();
        if (search?.Length > AdminService.SearchMaxLength)
        {
            errors["search"] = [$"The search must be at most {AdminService.SearchMaxLength} characters."];
        }
        if (errors.Count > 0)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        return Ok(await adminService.GetUsersAsync(search, validPage, validPageSize));
    }

    [HttpGet("roles")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetRoles()
    {
        return Ok(await roleService.GetRoleNamesAsync());
    }

    /// <summary>Grants a role. Returns 204, also when the user already has it.</summary>
    [HttpPut("users/{userId:int}/roles/{role}")]
    public Task<IActionResult> GrantRole(int userId, string role) => ChangeRoleAsync(userId, role, grant: true);

    /// <summary>Revokes a role. Returns 204, also when the user does not have it.</summary>
    [HttpDelete("users/{userId:int}/roles/{role}")]
    public Task<IActionResult> RevokeRole(int userId, string role) => ChangeRoleAsync(userId, role, grant: false);

    [HttpGet("role-changes")]
    public async Task<ActionResult<RoleChangePageResponse>> GetRoleChanges(int? page, int? pageSize)
    {
        var errors = new Dictionary<string, string[]>();
        var (validPage, validPageSize) = Paging.Validate(page, pageSize, errors);
        if (errors.Count > 0)
        {
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        return Ok(await adminService.GetRoleChangesAsync(validPage, validPageSize));
    }

    private async Task<IActionResult> ChangeRoleAsync(int userId, string role, bool grant)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: "This user does not exist.");
        }
        if (!await roleService.RoleExistsAsync(role))
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: $"The role '{role}' does not exist.");
        }

        var admin = await userManager.GetUserAsync(User);
        var error = grant
            ? await roleService.GrantAsync(user, role, admin, Origin)
            : await roleService.RevokeAsync(user, role, admin, Origin);
        return error is null
            ? NoContent()
            : Problem(statusCode: StatusCodes.Status409Conflict, title: error.Message);
    }
}
