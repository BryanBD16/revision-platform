# Architecture

This document records the architectural decisions for the application.
Update it when one of these decisions changes.

## Overview

| Part     | Technology                          | Location   |
|----------|-------------------------------------|------------|
| Frontend | Angular (standalone components)     | `frontend/` |
| Backend  | ASP.NET Core Web API (.NET 8)       | `backend/` |
| Database | MySQL 8.4 (Docker for development)  | `compose.yaml` |

The backend and frontend run directly on the host during development.
Only MySQL runs in Docker (see the README).

## Revision modules

A revision activity is an ordered list of modules. Each module has a
`type` (for example `reading`, `multiple-choice`, `matching`) and a
`content` object whose structure depends on that type.

- **Backend:** each module type has its own folder under
  `backend/src/RevisionPlatform.Api/Modules/` and implements
  `IModuleType`, which validates the type's JSON content and returns it
  normalized for storage. Most types derive from `ModuleType<TContent>`,
  which maps the JSON to a C# record so the type only implements
  `Validate` and `Normalize`. `ModuleTypeRegistry` resolves the
  implementation from the type key. The activity code never looks inside
  module content.
- **Frontend:** each module type has its own folder under
  `frontend/src/app/modules/` and provides a `ModuleTypeDefinition`: a
  label, a form factory with its validators, a function converting the
  form to the API content, an editor component (input `form`) and a
  player component (input `content`, output `completed` with the module's
  result). `MODULE_TYPES`
  lists the definitions; `ModuleEditorHost` and `ModulePlayerHost` render
  the editor or player of any type. The activity pages only use these
  hosts and never depend on a specific module type.
- **Playing an activity:** the activity player shows one module at a
  time. When a module's player emits `completed` (for a reading module,
  when the learner clicks Continue), it moves to the next module, then
  shows a completion screen. Nothing is saved.
- **Grading:** `completed` carries the module's result: `{ score,
  maxScore }`, or `null` for module types that are not graded (reading).
  The completion screen lists the grade of each module and a total: the
  sum of the scores over the sum of the maximum scores, as a fraction and
  a rounded percentage. Modules that are not graded do not count. The
  grade is computed in the browser.

### Adding a module type (backend)

1. Create `Modules/<TypeName>/` with a content record and a class
   deriving from `ModuleType<TContent>` (see `Modules/Reading/`).
2. Register it in `ModuleServiceCollectionExtensions.AddModuleTypes`.
3. Add unit tests for its validation, and document its content in
   `docs/api.md`.

No database migration is needed: the content is stored as JSON.

### Adding a module type (frontend)

1. Create `modules/<type-name>/` with the content interface, an editor
   component implementing `ModuleEditor`, a player component
   implementing `ModulePlayer`, and the `ModuleTypeDefinition` (see
   `modules/reading/`). Put the type's styles in its components' CSS
   files, not in the global `styles.css`, which only holds shared styles
   (layout, fields, buttons, colors).
2. Add the definition to `MODULE_TYPES` in `modules/module-types.ts`.
3. Add tests for the definition, the editor and the player.

## Database

### First iteration

```
revision_activities
  id, title, description, created_at (indexed), updated_at,
  visibility ('private' or 'public', indexed),
  owner_id -> users (cascade delete, null for a public activity)
  check: public and no owner, or private and an owner

revision_modules
  id, activity_id -> revision_activities (cascade delete),
  position (unique per activity), type, content JSON,
  created_at, updated_at

themes
  id, name (case-insensitive), kind ('topic' or 'course'),
  unique (kind, name), created_at

activity_themes
  activity_id -> revision_activities (cascade delete),
  theme_id -> themes,
  primary key (activity_id, theme_id)

users                (ASP.NET Core Identity)
  id, email, user_name (= email, unique), display_name, password_hash,
  security_stamp, lockout fields, created_at, ...

roles                (ASP.NET Core Identity)
  id, name (unique)

user_roles
  user_id -> users (cascade delete), role_id -> roles (cascade delete),
  primary key (user_id, role_id)

role_changes         (audit trail of the roles)
  id, user_id -> users, role_name, action ('granted' or 'revoked'),
  changed_by_user_id -> users (null for a server command), origin,
  changed_at (indexed)
```

Identity also creates `user_claims`, `user_logins`, `user_tokens` and
`role_claims`, which are not used yet.

- Ids are auto-increment integers.
- Module content is stored as JSON and validated by the module type's
  backend code, not by the database. It is never queried by its inner
  fields.
- Choices and pairs inside module content have their own ids, so future
  saved answers can refer to them independently of display order.
- Themes are subject categories. Every activity has at least one theme.
  Themes are typed freely when creating an activity: an existing theme
  with the same name (ignoring case) is reused, otherwise it is created.
  There is no separate theme management.
- A course is a theme with the kind `course` (the others are `topic`).
  An activity can be part of any number of courses, and courses do not
  count toward the required theme. Storing both in one table lets them
  share the reuse logic and the join table; the API still exposes them
  as separate `themes` and `courses` lists with their own endpoints.
- The schema changes only through EF Core migrations
  (`backend/src/RevisionPlatform.Api/Data/Migrations`). Tables and
  columns use `snake_case` (EFCore.NamingConventions); C# code uses the
  usual PascalCase.
- Theme names use the `utf8mb4_0900_as_ci` collation: case-insensitive
  but accent-sensitive, so "Biology" and "biology" are the same theme,
  while "Resume" and "Résumé" are different.
- The backend reads its connection string from `ConnectionStrings:Default`.
  In development the Makefile builds it from `.env`.

### Listing and filtering activities

The activity list is paginated and filtered by the server
(`GET /api/activities`, see `docs/api.md`), because the list will grow
and future personal activities must never be sent to other users.

- **Backend:** `ActivityListValidator` checks the query parameters and
  applies the defaults. `ActivityService` adds each filter that is set
  to the EF Core query (title contains, course, every selected theme),
  then runs a count query and a page query sorted by `created_at`, then
  `id`, so pages are stable.
- **Frontend:** the URL query parameters (`page`, `title`, `courseId`,
  `themeIds`) are the state of the list page, so reloading, the back
  button and shared links keep the filters. `ActivityFilters` emits a new
  query (always on page 1) and `ActivityList` navigates to it; the list
  reloads when the URL changes. The course and theme fields use a native
  `<datalist>` for text search in the existing names.

### Completing an activity

In the first iteration, completing an activity happens entirely in the
browser: the player walks through the modules and checks answers
client-side. Nothing about a completion is stored.

## Authentication

- **ASP.NET Core Identity** stores the users and hashes the passwords
  (PBKDF2). `AppDbContext` is an `IdentityDbContext` with integer ids,
  and the tables have short names (`users`, `roles`, `user_roles`...).
  `Auth/AuthServiceCollectionExtensions.cs` holds all the settings.
- **Session cookie**, not tokens stored by JavaScript: the cookie is
  HttpOnly, so a script injected in the page cannot steal the session.
- **The user is checked against the database on every request**
  (`SecurityStampValidatorOptions.ValidationInterval` is zero), and the
  session is rebuilt from it. A role change therefore applies on the
  next request, and changing or resetting the password (which changes
  the security stamp) ends the other sessions immediately.
- **Cross-site request forgery:** the session cookie is SameSite=Strict,
  and every `POST`, `PUT` and `DELETE` request also needs an anti-forgery
  token (`XsrfCookie`, `ValidateAntiforgeryFilter`). Angular's
  `HttpClient` reads the `XSRF-TOKEN` cookie and sends the
  `X-XSRF-TOKEN` header by itself.
- **Passwords:** at least 12 characters without character-class rules
  (NIST SP 800-63B), lockout after 5 failures, and rate limiting of the
  endpoints that take a password.
- **Known limit:** signing in with an unknown email answers slightly
  faster than with a wrong password (no password hash is computed), which
  could reveal which emails have accounts. The rate limit makes this
  slow to exploit.
- **Frontend:** `AuthService` holds the signed-in user in a signal,
  loaded by an app initializer before the first page is shown.
  `signedInGuard` sends visitors to `/sign-in?returnUrl=...`, and
  `safeReturnUrl` only accepts paths of the application after signing in
  (no open redirect).
- **Tests** use the real flow: `ApiFactory.CreateApiClient()` keeps the
  cookies and sends the anti-forgery header like the browser, and
  `RegisterAsync()` creates and signs in a user.

## Private and public activities

- **The rule is in one place:** `ActivityVisibility.VisibleTo(viewerId)`
  keeps the public activities and the viewer's own private activities.
  `ActivityService` (list and detail) and `ThemeService` (themes and
  courses) start their queries from it, so a new query cannot forget it
  by accident as long as it uses these services. Admins are not an
  exception: publishing is their only extra right.
- **Another user's private activity returns 404**, not 403, so its
  existence is not revealed.
- **Public activities have no owner.** Only the users with the
  `publish-activities` permission can create one; the controller checks
  it. A check constraint in the database refuses a public activity with
  an owner or a private activity without one.
- **Themes and courses stay shared** (one row per name), but the lists
  only return the names used by visible activities.
- **Seed activities** are created by a backend command (`dotnet run --
  seed <directory>`, `make db-seed`), as public activities. It validates
  every file with `ActivityValidator` before creating any activity. The
  activities created before users existed became public.

## Roles and permissions

- **Roles are rows** of the `roles` table (Identity), linked to users by
  `user_roles`, so a user can have several roles. A user without a role
  is a regular user. The roles that the code relies on are created by
  migrations (`HasData` in `AppDbContext`); `RoleNames` lists them.
- **The code checks permissions, not roles.** `Auth/Policies.cs` maps
  each permission (`publish-activities`, `manage-roles`) to the roles
  that have it. Giving a permission to a new role, such as a future
  `teacher`, only changes that file. `GET /api/auth/me` returns the
  permissions so the frontend (`AuthService.can`, `permissionGuard`)
  shows the same thing the API allows.
- **`RoleService` is the only way to change roles.** It refuses to
  remove the last admin or an admin's own admin role, and records each
  change in `role_changes` in the same transaction.
- **The first admin is created with a command** on the server
  (`Commands/UserCommands.cs`, `make user-grant-role`), because nobody
  can grant a role in the application before an admin exists. Anyone
  who can run it already controls the database, so it adds no new
  power. It uses Identity and `RoleService` rather than SQL, shows the
  account and asks for confirmation (emails are not verified, so the
  person must check it is the right account), and records the system
  user and machine in the audit trail. It is never exposed over HTTP.
  Promoting an email listed in the configuration was rejected: anyone
  could register that email first. After the first admin, roles are
  managed on the admin page (`/api/admin`).
- `Program.cs` runs a command instead of the web server when the first
  argument is `users` (`dotnet run -- users list`).

## Designed to evolve toward progress

Long term, the application will have saved results and learning
progress. None of this is implemented yet, but the design keeps it easy
to add:

- **Content and learner data stay separate.** Activity and module tables
  hold only authored content; no completion, score or user fields.
- **Module ids are stable.** Editing an activity updates modules in
  place rather than deleting and recreating them, so future results can
  reference them.
- **API routes are not public-specific** (`/api/activities`), so they can
  later be scoped to the signed-in user without changing shape.

Expected future additions:

| Concept | Addition |
|---|---|
| Google sign-in (optional) | Identity's `user_logins` table and `AddGoogle()` |
| Saved results | `activity_attempts`, `module_responses` (response JSON per module type) |
| Learning progress | derived from attempts; a summary table only if needed |
| Server-side answer checking | per-type `Evaluate(content, response)`; learner view without answers |

Deferred until they are needed: soft deletion and activity versioning.
