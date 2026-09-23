using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Modules;
using RevisionPlatform.Api.Themes;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException(
        "Connection string 'Default' is not configured. Set the ConnectionStrings__Default environment variable (the Makefile does this from .env).");

builder.Services.AddDbContext<AppDbContext>(options => options
    .UseMySql(connectionString, new MySqlServerVersion(new Version(8, 4)))
    .UseSnakeCaseNamingConvention());

builder.Services.AddModuleTypes();
builder.Services.AddScoped<ActivityValidator>();
builder.Services.AddScoped<ActivityService>();
builder.Services.AddScoped<ThemeService>();

builder.Services.AddControllers();
builder.Services.AddHealthChecks();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/api/health");

app.Run();

// Exposes the implicit Program class to the integration tests (WebApplicationFactory).
public partial class Program { }
