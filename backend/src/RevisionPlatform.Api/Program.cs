using Microsoft.EntityFrameworkCore;
using RevisionPlatform.Api.Activities;
using RevisionPlatform.Api.Admin;
using RevisionPlatform.Api.Auth;
using RevisionPlatform.Api.Commands;
using RevisionPlatform.Api.Data;
using RevisionPlatform.Api.Modules;
using RevisionPlatform.Api.Themes;

var builder = WebApplication.CreateBuilder(args);

// "dotnet run -- users ..." runs a command instead of the web server (see UserCommands).
var isCommand = args is [UserCommands.Name, ..];
if (isCommand)
{
    // Keep the output of the command readable: no information logs (SQL queries...).
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["Logging:LogLevel:Default"] = "Warning",
    });
}

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException(
        "Connection string 'Default' is not configured. Set the ConnectionStrings__Default environment variable (the Makefile does this from .env).");

builder.Services.AddDbContext<AppDbContext>(options => options
    .UseMySql(connectionString, new MySqlServerVersion(new Version(8, 4)))
    .UseSnakeCaseNamingConvention());

builder.Services.AddAppAuthentication(builder.Configuration, builder.Environment);
builder.Services.AddModuleTypes();
builder.Services.AddScoped<ActivityValidator>();
builder.Services.AddScoped<ActivityService>();
builder.Services.AddScoped<AdminService>();
builder.Services.AddScoped<ThemeService>();

// Every POST, PUT and DELETE request needs the anti-forgery token (see XsrfCookie).
builder.Services.AddControllers(options => options.Filters.Add<ValidateAntiforgeryFilter>());
builder.Services.AddHealthChecks();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (isCommand)
{
    return await UserCommands.RunAsync(app.Services, args[1..], Console.In, Console.Out);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseRateLimiter();
app.UseXsrfCookie();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/api/health");

app.Run();
return 0;

// Exposes the implicit Program class to the integration tests (WebApplicationFactory).
public partial class Program { }
