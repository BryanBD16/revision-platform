# Production image of the backend API. Build context: the backend directory.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first, so the packages stay cached while only the code changes.
COPY src/RevisionPlatform.Api/RevisionPlatform.Api.csproj src/RevisionPlatform.Api/
RUN dotnet restore src/RevisionPlatform.Api/RevisionPlatform.Api.csproj

COPY src/RevisionPlatform.Api/ src/RevisionPlatform.Api/
RUN dotnet publish src/RevisionPlatform.Api/RevisionPlatform.Api.csproj \
    --configuration Release --no-restore --output /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# The keys that encrypt the session cookies live here; mount a volume on it so
# the users stay signed in when the container is recreated.
RUN mkdir -p /home/app/.aspnet/DataProtection-Keys \
    && chown -R app:app /home/app/.aspnet

COPY --from=build /app .

USER app
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# "docker run <image> migrate" (or "users ...", "seed ...") runs a command instead of the API.
ENTRYPOINT ["dotnet", "RevisionPlatform.Api.dll"]
