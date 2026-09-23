using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Themes;

namespace RevisionPlatform.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<RevisionActivity> RevisionActivities => Set<RevisionActivity>();
    public DbSet<Theme> Themes => Set<Theme>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RevisionActivity>(activity =>
        {
            activity.Property(a => a.Title).HasMaxLength(RevisionActivity.TitleMaxLength);
            activity.Property(a => a.Description).HasColumnType("text");

            activity
                .HasMany(a => a.Themes)
                .WithMany()
                .UsingEntity(
                    "activity_themes",
                    r => r.HasOne(typeof(Theme)).WithMany().HasForeignKey("theme_id"),
                    l => l.HasOne(typeof(RevisionActivity)).WithMany().HasForeignKey("activity_id"),
                    j => j.HasKey("activity_id", "theme_id"));
        });

        modelBuilder.Entity<Theme>(theme =>
        {
            // Case-insensitive but accent-sensitive, so "Biology" and "biology" are the same theme.
            theme.Property(t => t.Name)
                .HasMaxLength(Theme.NameMaxLength)
                .UseCollation("utf8mb4_0900_as_ci");
            theme.HasIndex(t => t.Name).IsUnique();
        });
    }
}
