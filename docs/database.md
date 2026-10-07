# Database schema

The MySQL tables and their relations, as entity-relationship diagrams in
crow's foot notation. GitHub renders the Mermaid diagrams; in VS Code,
use a Markdown preview extension that supports Mermaid.

The schema only changes through EF Core migrations
(`backend/src/RevisionPlatform.Api/Data/Migrations`). **Update this page
in the same change as every migration** that adds, removes or changes a
table, a column, a key or a relation. The design choices behind the
tables are explained in [architecture.md](architecture.md#database).

How to read the diagrams:

| Symbol | Meaning                 |
|--------|-------------------------|
| `PK`   | Primary key             |
| `FK`   | Foreign key             |
| `UK`   | Unique (alone or with the other `UK` columns of the table) |
| `\|\|` | Exactly one             |
| `o\|`  | Zero or one (nullable foreign key) |
| `o{`   | Zero or many            |

Tables and columns use `snake_case`. Ids are auto-increment `int`s.
`__EFMigrationsHistory` (managed by EF Core: the migrations already
applied) is not shown.

## Overview

```mermaid
erDiagram
    users |o--o{ revision_activities : "owns (private)"
    users |o--o{ revision_activities : "last edited"
    revision_activities ||--o{ revision_modules : contains
    revision_activities ||--o{ activity_themes : "is tagged"
    themes ||--o{ activity_themes : tags

    users ||--o{ activity_attempts : completes
    revision_activities |o--o{ activity_attempts : "attempted in"
    activity_attempts ||--o{ attempt_modules : contains
    revision_modules |o--o{ attempt_modules : "scored in"

    users ||--o{ trivia_scores : plays
    trivia_scores ||--o{ trivia_score_themes : "played on"
    themes |o--o{ trivia_score_themes : "played in"

    users ||--o{ typing_results : types

    users ||--o{ user_roles : has
    roles ||--o{ user_roles : "given to"
    users ||--o{ role_changes : "role changed"
    users |o--o{ role_changes : "changed by"
```

## Activities and themes

```mermaid
erDiagram
    users |o--o{ revision_activities : "owns (private)"
    users |o--o{ revision_activities : "last edited"
    revision_activities ||--o{ revision_modules : contains
    revision_activities ||--o{ activity_themes : "is tagged"
    themes ||--o{ activity_themes : tags

    revision_activities {
        int id PK
        varchar(200) title
        text description "nullable"
        varchar(20) visibility "public or private, indexed"
        int owner_id FK "null for a public activity"
        int last_edited_by_user_id FK "nullable"
        datetime(6) created_at "UTC, indexed"
        datetime(6) updated_at "UTC"
    }
    revision_modules {
        int id PK
        int activity_id FK, UK
        int position UK "order in the activity"
        varchar(50) type "module type key, such as reading"
        json content "checked by the module type's code"
        datetime(6) created_at "UTC"
        datetime(6) updated_at "UTC"
    }
    themes {
        int id PK
        varchar(20) kind UK "topic or course"
        varchar(100) name UK "case-insensitive"
        datetime(6) created_at "UTC"
    }
    activity_themes {
        int activity_id PK, FK
        int theme_id PK, FK
    }
    users {
        int id PK
    }
```

- **Check constraint** `ck_revision_activities_visibility_owner`: a
  public activity has no owner, a private activity has one.
- A course is a theme whose `kind` is `course`; the others are `topic`.
- `themes.name` uses the `utf8mb4_0900_as_ci` collation:
  case-insensitive, accent-sensitive.

## Results and trivia scores

Results keep copies of what they show (`activity_title`, `label`,
`theme_name`), so their links can become null when an activity, a module
or a theme is deleted.

```mermaid
erDiagram
    users ||--o{ activity_attempts : completes
    revision_activities |o--o{ activity_attempts : "attempted in"
    activity_attempts ||--o{ attempt_modules : contains
    revision_modules |o--o{ attempt_modules : "scored in"
    users ||--o{ trivia_scores : plays
    trivia_scores ||--o{ trivia_score_themes : "played on"
    themes |o--o{ trivia_score_themes : "played in"

    activity_attempts {
        int id PK
        int user_id FK "indexed with completed_at"
        int activity_id FK "null once the activity is deleted"
        varchar(200) activity_title "copy"
        int score "null if nothing is graded"
        int max_score "null if nothing is graded"
        datetime(6) completed_at "UTC"
    }
    attempt_modules {
        int id PK
        int attempt_id FK, UK
        int module_id FK "null once the module is deleted"
        int position UK "order in the attempt"
        varchar(50) module_type "copy"
        varchar(1000) label "copy, nullable"
        int score "null for a module that is not graded"
        int max_score "null for a module that is not graded"
    }
    trivia_scores {
        int id PK
        int user_id FK "indexed with played_at"
        int score "correct answers in a row"
        datetime(6) played_at "UTC"
    }
    trivia_score_themes {
        int id PK
        int trivia_score_id FK
        int theme_id FK "null once the theme is deleted"
        varchar(100) theme_name "copy"
    }
    users {
        int id PK
    }
    revision_activities {
        int id PK
    }
    revision_modules {
        int id PK
    }
    themes {
        int id PK
    }
```

## Typing test results

The typing test is independent of the activities: its results are only
linked to the user.

```mermaid
erDiagram
    users ||--o{ typing_results : types

    typing_results {
        int id PK
        int user_id FK "indexed with played_at"
        varchar(30) mode "game mode, e.g. timed"
        int duration_seconds "timed tests only, nullable"
        int average_wpm "words per minute"
        int peak_wpm "words per minute"
        datetime(6) played_at "UTC"
    }
    users {
        int id PK
    }
```

## Accounts and roles

The tables of ASP.NET Core Identity, plus `role_changes`, the audit
trail of the roles. `user_claims`, `user_logins`, `user_tokens` and
`role_claims` are created by Identity but not used yet.

```mermaid
erDiagram
    users ||--o{ user_roles : has
    roles ||--o{ user_roles : "given to"
    roles ||--o{ role_claims : has
    users ||--o{ user_claims : has
    users ||--o{ user_logins : has
    users ||--o{ user_tokens : has
    users ||--o{ role_changes : "role changed"
    users |o--o{ role_changes : "changed by"

    users {
        int id PK
        varchar(256) email
        varchar(256) normalized_email "indexed"
        varchar(256) user_name "same as the email"
        varchar(256) normalized_user_name UK
        varchar(100) display_name
        longtext password_hash
        longtext security_stamp
        longtext concurrency_stamp
        tinyint(1) email_confirmed
        longtext phone_number
        tinyint(1) phone_number_confirmed
        tinyint(1) two_factor_enabled
        datetime(6) lockout_end "nullable"
        tinyint(1) lockout_enabled
        int access_failed_count
        datetime(6) created_at "UTC"
    }
    roles {
        int id PK
        varchar(256) name
        varchar(256) normalized_name UK
        longtext concurrency_stamp
    }
    user_roles {
        int user_id PK, FK
        int role_id PK, FK
    }
    role_changes {
        int id PK
        int user_id FK
        varchar(256) role_name
        varchar(20) action "granted or revoked"
        int changed_by_user_id FK "null for a server command"
        varchar(200) origin
        datetime(6) changed_at "UTC, indexed"
    }
    role_claims {
        int id PK
        int role_id FK
        longtext claim_type
        longtext claim_value
    }
    user_claims {
        int id PK
        int user_id FK
        longtext claim_type
        longtext claim_value
    }
    user_logins {
        varchar(255) login_provider PK
        varchar(255) provider_key PK
        longtext provider_display_name
        int user_id FK
    }
    user_tokens {
        int user_id PK, FK
        varchar(255) login_provider PK
        varchar(255) name PK
        longtext value
    }
```

## What happens on delete

| Deleted row          | Effect on the rows that reference it |
|----------------------|--------------------------------------|
| `revision_activities` | Its `revision_modules` and `activity_themes` are deleted; `activity_attempts.activity_id` becomes null. |
| `revision_modules`   | `attempt_modules.module_id` becomes null. |
| `themes`             | Its `activity_themes` are deleted; `trivia_score_themes.theme_id` becomes null. |
| `activity_attempts`  | Its `attempt_modules` are deleted. |
| `trivia_scores`      | Its `trivia_score_themes` are deleted. |
| `users`              | Their private activities, attempts, trivia scores, typing results, roles, claims, logins and tokens are deleted; `revision_activities.last_edited_by_user_id` becomes null. **Refused** while `role_changes` references the user. |
| `roles`              | Its `user_roles` and `role_claims` are deleted. |
