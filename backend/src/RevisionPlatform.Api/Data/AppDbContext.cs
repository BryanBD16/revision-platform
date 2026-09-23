using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Modules;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<RevisionActivity> RevisionActivities => Set<RevisionActivity>();
    public DbSet<Theme> Themes => Set<Theme>();
    public DbSet<RevisionModule> RevisionModules => Set<RevisionModule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
}
