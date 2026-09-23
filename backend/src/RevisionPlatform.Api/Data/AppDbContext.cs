using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Modules;
using RevisionPlatform.Api.Themes;
using RevisionPlatform.Api.Users;

namespace RevisionPlatform.Api.Data;

/// <summary>
/// The application data and the ASP.NET Core Identity tables (users, roles and the
/// links between them), with integer ids.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<int>, int>(options)
{
    public DbSet<RevisionActivity> RevisionActivities => Set<RevisionActivity>();
    public DbSet<Theme> Themes => Set<Theme>();
    public DbSet<RevisionModule> RevisionModules => Set<RevisionModule>();
    public DbSet<RoleChange> RoleChanges => Set<RoleChange>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        ConfigureIdentity(modelBuilder);

        modelBuilder.Entity<RevisionActivity>(activity =>
        {
            activity.Property(a => a.Title).HasMaxLength(RevisionActivity.TitleMaxLength);
            activity.Property(a => a.Description).HasColumnType("text");
            // The list is sorted by creation date.
            activity.HasIndex(a => a.CreatedAt);

            activity
                .HasMany(a => a.Themes)
                .WithMany()
                .UsingEntity(
                    "activity_themes",
                    r => r.HasOne(typeof(Theme)).WithMany().HasForeignKey("theme_id"),
                    l => l.HasOne(typeof(RevisionActivity)).WithMany().HasForeignKey("activity_id"),
                    j => j.HasKey("activity_id", "theme_id"));
        });

        modelBuilder.Entity<RevisionModule>(module =>
        {
            module.Property(m => m.Type).HasMaxLength(RevisionModule.TypeMaxLength);
            module.Property(m => m.Content).HasColumnType("json");

            module
                .HasOne<RevisionActivity>()
                .WithMany(a => a.Modules)
                .HasForeignKey(m => m.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);
            module.HasIndex(m => new { m.ActivityId, m.Position }).IsUnique();
        });

        modelBuilder.Entity<Theme>(theme =>
        {
            // Case-insensitive but accent-sensitive, so "Biology" and "biology" are the same theme.
            theme.Property(t => t.Name)
                .HasMaxLength(Theme.NameMaxLength)
                .UseCollation("utf8mb4_0900_as_ci");
            theme.Property(t => t.Kind).HasMaxLength(Theme.KindMaxLength);
            // A topic and a course can have the same name.
            theme.HasIndex(t => new { t.Kind, t.Name }).IsUnique();
        });
    }

    private static void ConfigureIdentity(ModelBuilder modelBuilder)
    {
        // Shorter table names than Identity's AspNetUsers, AspNetRoles...
        modelBuilder.Entity<AppUser>(user =>
        {
            user.ToTable("users");
            user.Property(u => u.DisplayName).HasMaxLength(AppUser.DisplayNameMaxLength);
        });
        modelBuilder.Entity<IdentityRole<int>>(role =>
        {
            role.ToTable("roles");
            // The roles are data that the code relies on, so they are created by migrations.
            role.HasData(new IdentityRole<int>
            {
                Id = 1,
                Name = RoleNames.Admin,
                NormalizedName = RoleNames.Admin.ToUpperInvariant(),
                ConcurrencyStamp = "5d0c3e0e-7a4f-4a53-9d1a-1f0e2c3b4a01",
            });
        });
        modelBuilder.Entity<IdentityUserRole<int>>().ToTable("user_roles");
        modelBuilder.Entity<RoleChange>(change =>
        {
            change.Property(c => c.RoleName).HasMaxLength(256);
            change.Property(c => c.Action).HasMaxLength(RoleChange.ActionMaxLength);
            change.Property(c => c.Origin).HasMaxLength(RoleChange.OriginMaxLength);
            // The audit trail must stay complete: a user with role changes cannot be deleted
            // without deciding what happens to them.
            change.HasOne(c => c.User).WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Restrict);
            change.HasOne(c => c.ChangedBy).WithMany().HasForeignKey(c => c.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            change.HasIndex(c => c.ChangedAt);
        });
        modelBuilder.Entity<IdentityUserClaim<int>>().ToTable("user_claims");
        modelBuilder.Entity<IdentityUserLogin<int>>().ToTable("user_logins");
        modelBuilder.Entity<IdentityUserToken<int>>().ToTable("user_tokens");
        modelBuilder.Entity<IdentityRoleClaim<int>>().ToTable("role_claims");
    }
}
