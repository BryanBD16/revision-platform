using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Tests.Infrastructure;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Tests;

[Collection(ApiCollection.Name)]
public class RolesTests(ApiFactory factory)
{
    [Fact]
    public async Task Migrations_CreateTheAdminRole()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var role = await db.Roles.SingleAsync(r => r.Name == RoleNames.Admin);

        Assert.Equal("ADMIN", role.NormalizedName);
    }
}
