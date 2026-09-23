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

- **Backend:** each module type has its own folder and implements a
  shared contract that validates its content. A registry resolves the
  implementation from the type key. Adding a type means adding a folder
  and registering it; unrelated code does not change.
- **Frontend:** each module type has its own folder with an editor
  component and a player component. A registry maps the type key to
  those components, and a generic host renders them.

## Database

### First iteration

```
revision_activities
  id, title, description, created_at, updated_at

revision_modules
  id, activity_id -> revision_activities (cascade delete),
  position (unique per activity), type, content JSON,
  created_at, updated_at

themes
  id, name (unique, case-insensitive), created_at

activity_themes
  activity_id -> revision_activities (cascade delete),
  theme_id -> themes,
  primary key (activity_id, theme_id)
```

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
- The schema changes only through EF Core migrations
  (`backend/src/RevisionPlatform.Api/Data/Migrations`). Tables and
  columns use `snake_case` (EFCore.NamingConventions); C# code uses the
  usual PascalCase.
- Theme names use the `utf8mb4_0900_as_ci` collation: case-insensitive
  but accent-sensitive, so "Biology" and "biology" are the same theme,
  while "Resume" and "Résumé" are different.
- The backend reads its connection string from `ConnectionStrings:Default`.
  In development the Makefile builds it from `.env`.

### Completing an activity

In the first iteration, completing an activity happens entirely in the
browser: the player walks through the modules and checks answers
client-side. Nothing about a completion is stored.

### Designed to evolve toward users and progress

Long term, the application will have Google sign-in, user-specific
activities, saved results and learning progress. None of this is
implemented yet, but the design keeps it easy to add:

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
| Google sign-in | `users`, `user_external_logins` (provider + Google `sub`, unique) |
| User-specific activities | nullable `owner_user_id` on `revision_activities` (and possibly on `themes`) |
| Saved results | `activity_attempts`, `module_responses` (response JSON per module type) |
| Learning progress | derived from attempts; a summary table only if needed |
| Server-side answer checking | per-type `Evaluate(content, response)`; learner view without answers |

Deferred until they are needed: soft deletion, activity versioning, and
choosing between ASP.NET Core Identity and a custom `users` table.
