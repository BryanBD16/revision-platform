# Course Revision Platform

A web application for reviewing course material through revision
activities. See [docs/requirements.md](docs/requirements.md) for the
current requirements, [docs/architecture.md](docs/architecture.md)
for the architectural decisions and [docs/api.md](docs/api.md) for the
REST API.

## Prerequisites

- Docker Engine with the Compose plugin
- .NET 8 SDK
- Node.js 24 (the version is pinned in `.nvmrc`; with nvm, run `nvm use`)
- make

Your user must be allowed to use Docker without `sudo`:

```sh
sudo usermod -aG docker $USER
# then log out and back in (or run `newgrp docker` in the current shell)
```

## Local database

MySQL 8.4 runs in Docker. The backend and frontend run directly on the
host.

1. Create your local environment file and set the passwords:

   ```sh
   cp .env.example .env
   ```

2. Start the database:

   ```sh
   make db-up
   ```

The database is exposed on `127.0.0.1:3307` (configurable with
`MYSQL_PORT`), so it does not conflict with a MySQL server already
running on port 3306.

Two databases are available to the application user:

- `revision_platform`: development data
- `revision_platform_test`: integration tests

Data is stored in the `mysql-data` Docker volume and survives container
restarts. The scripts in `docker/mysql/init/` run only when that volume
is first created; run `make db-reset` then `make db-up` to apply changes
to them.

### Seed data

`seed/activities/` contains two courses:

- `Revision Platform` (`01-…` to `05-…`): the project itself (database,
  Docker, backend, frontend and Makefile), with themes such as `MySQL`,
  `Angular` or `Testing`.
- `Introduction to C#` (`csharp-…`): five short activities on the
  language, its syntax, encapsulation, inheritance and ASP.NET Core.
 Each file has the format of
a `POST /api/activities` request body. The backend does not need to be
running:

```sh
make db-clear   # optional: delete all activities, modules and themes
make db-seed    # create the seed activities, as public activities
```

`db-seed` first validates every file with the same rules as the API; if
one is invalid, it shows the errors and creates nothing. Running it
twice creates the activities twice.

### Users and the first admin

Create an account in the application (**Create an account** in the
header), then make yourself admin from the terminal:

```sh
make user-list                                          # check the account
make user-grant-role EMAIL=you@example.com ROLE=admin   # asks for confirmation
```

After that, admins give and remove roles on the **Administration** page;
every change is recorded, with who made it. The commands stay available
for people with access to the server, for example if every admin is
locked out:

- `make user-reset-password EMAIL=...` gives the user a random temporary
  password (to send privately), unlocks the account and signs out all
  its sessions. The user changes it on the **Account** page.
- The commands refuse to remove the last admin.

## Backend

The ASP.NET Core API is in `backend/` (`src/RevisionPlatform.Api`,
tests in `tests/RevisionPlatform.Api.Tests`). It needs the database to
be running, with the migrations applied:

```sh
make db-up
make db-migrate    # after pulling changes that add migrations
make backend-run
```

The API listens on `http://localhost:5044`. Health check:
`GET /api/health`. In development, Swagger UI is available at
`/swagger`.

The Makefile builds the connection string from `.env`
(`ConnectionStrings__Default`), so run the backend through `make`.
The backend tests use the `revision_platform_test` database, which they
recreate on every run; `make backend-test` needs the database container
to be running.

To change the database schema, edit the entities or `AppDbContext`, then
create and apply a migration:

```sh
make db-migration NAME=DescribeTheChange
make db-migrate
```

## Frontend

The Angular app is in `frontend/`. Install its dependencies once, then
start the dev server:

```sh
make frontend-install
make frontend-run
```

The app is served on `http://localhost:4200`. Requests to `/api` are
forwarded to the backend on port 5044 (see `frontend/proxy.conf.json`),
so the backend must be running too. Tests use Vitest.

## Commands

Run `make` to list all commands.

| Command                      | Description                                          |
|------------------------------|------------------------------------------------------|
| `make build`                 | Build all components                                 |
| `make test`                  | Run all tests                                        |
| `make backend-build`         | Build the backend                                    |
| `make backend-test`          | Run the backend tests                                |
| `make backend-run`           | Run the API with hot reload                          |
| `make frontend-install`      | Install frontend dependencies                        |
| `make frontend-build`        | Build the frontend                                   |
| `make frontend-test`         | Run the frontend tests once                          |
| `make frontend-run`          | Run the frontend dev server                          |
| `make db-migrate`            | Apply migrations to the development database         |
| `make db-migration NAME=...` | Create a migration                                   |
| `make db-up`                 | Start the MySQL container and wait until healthy     |
| `make db-down`               | Stop the MySQL container (data is kept)              |
| `make db-logs`               | Follow the MySQL container logs                      |
| `make db-shell`              | Open a MySQL prompt as the application user          |
| `make db-reset`              | Stop the container and **delete all its data**       |
| `make db-clear`              | Delete all activities, modules and themes            |
| `make db-seed`               | Create the seed activities as public activities      |
| `make user-list`             | List the users and their roles                       |
| `make user-grant-role EMAIL=... ROLE=...` | Give a role to a user (asks for confirmation) |
| `make user-revoke-role EMAIL=... ROLE=...` | Remove a role from a user (asks for confirmation) |
| `make user-reset-password EMAIL=...` | Give a user a temporary password          |
