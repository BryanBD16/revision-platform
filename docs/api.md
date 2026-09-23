# API

All endpoints are under `/api`. Requests and responses use JSON with
camelCase property names. Timestamps are in UTC (ISO 8601).

In development, Swagger UI at `http://localhost:5044/swagger` lists the
endpoints. Swagger UI does not send the anti-forgery header, so it can
only call the `GET` endpoints.

## Security

- **Session:** signing in sets the `revision_session` cookie (HttpOnly,
  SameSite=Strict, HTTPS-only outside development, 14 days, renewed
  while used). The browser sends it with every request.
- **Anti-forgery token:** every `GET /api/...` response sets the
  `XSRF-TOKEN` cookie. Every `POST`, `PUT` and `DELETE` request must
  copy its value into the `X-XSRF-TOKEN` header, otherwise it gets `400`.
  The token belongs to the signed-in user (or to "nobody"), so signing
  in, registering and signing out send a new one. Angular's `HttpClient`
  does this automatically.
- **Refused requests** get `401` (not signed in) or `403` (not allowed),
  never a redirect.
- **Rate limiting:** `register`, `sign-in` and `change-password` accept 10
  requests per minute per IP address (setting
  `RateLimiting:PasswordRequestsPerMinute`), then answer `429`.

## Authentication

### Current user

```json
{
  "id": 1,
  "email": "ada@example.com",
  "displayName": "Ada",
  "roles": ["admin"],
  "permissions": ["publish-activities", "manage-roles"]
}
```

`roles` is sorted by name and empty for a regular user. `permissions`
lists what the user is allowed to do; the frontend uses it to show or
hide actions, and the API checks the same permissions:

| Permission           | Roles   | Allows                            |
|----------------------|---------|-----------------------------------|
| `publish-activities` | `admin` | creating public activities, changing the visibility of an activity |
| `manage-public-activities` | `admin` | editing and deleting any public activity |
| `manage-roles`       | `admin` | the `/api/admin` endpoints        |

### `GET /api/auth/me`

Returns the signed-in user, or `204` when nobody is signed in.

### `POST /api/auth/register`

```json
{ "email": "ada@example.com", "password": "correct horse battery", "displayName": "Ada" }
```

Creates an account, signs the new user in and returns `201` with the
current user.

- `email`: required, a plain email address, at most 256 characters.
  Surrounding spaces are removed. It must not be used by another account
  (ignoring case).
- `password`: required, from 12 to 128 characters. No character classes
  are required; spaces count.
- `displayName`: required, at most 100 characters. Surrounding spaces
  are removed.

Invalid values return `400` with errors keyed by field.

### `POST /api/auth/sign-in`

```json
{ "email": "ada@example.com", "password": "correct horse battery" }
```

Returns `200` with the current user. The email ignores case. A wrong
password and an unknown email both return `401` with the same title.
After 5 failed attempts, the account is locked for 15 minutes: signing
in returns `401` with a title saying so, even with the right password.

### `POST /api/auth/sign-out`

Ends the session. Returns `204`.

### `POST /api/auth/change-password`

```json
{ "currentPassword": "correct horse battery", "newPassword": "a brand new password" }
```

Requires a signed-in user. Returns `204`. The new password follows the
registration rules. A wrong current password returns `400` with an error
on `currentPassword`. The other sessions of the user are signed out.

## Health

`GET /api/health` returns `200` with the text `Healthy`.

## Administration

Only the users with the `manage-roles` permission can call these
endpoints: others get `401` (not signed in) or `403`.

### `GET /api/admin/users`

Returns a page of users sorted by email: `{ items, page, pageSize,
totalCount }`, with `page` and `pageSize` as for the activity list, and
an optional `search` (at most 256 characters) matching the email or the
display name, ignoring case.

```json
{
  "id": 2,
  "email": "ada@example.com",
  "displayName": "Ada",
  "roles": [],
  "createdAt": "2026-09-23T17:41:08.123456Z",
  "lockedOut": false
}
```

### `GET /api/admin/roles`

Returns the names of the roles, sorted: `["admin"]`.

### `PUT /api/admin/users/{userId}/roles/{role}`

Gives the role to the user. Returns `204`, also when the user already
has it (nothing is recorded then).

### `DELETE /api/admin/users/{userId}/roles/{role}`

Removes the role from the user. Returns `204`, also when the user does
not have it. Returns `409` with a title explaining why when an admin
tries to remove their own admin role, or to remove the last admin.

Both return `404` for an unknown user or role. Each change is recorded
in the audit trail.

### `GET /api/admin/role-changes`

Returns a page of the audit trail, newest first, with `page` and
`pageSize`:

```json
{
  "id": 7,
  "user": { "id": 2, "email": "ada@example.com", "displayName": "Ada" },
  "role": "admin",
  "action": "granted",
  "changedBy": { "id": 1, "email": "grace@example.com", "displayName": "Grace" },
  "origin": "admin page",
  "changedAt": "2026-09-23T17:45:30.654321Z"
}
```

`action` is `granted` or `revoked`. `changedBy` is `null` for a change
made with a command on the server; `origin` then says
`command line (<system user>@<machine>)`.

## Themes and courses

Themes (what an activity is about) and courses (where it is used) are
created with activities (see `POST /api/activities`). They are stored in
the same table but have separate ids and lists.

### `GET /api/themes`

Returns the themes used by at least one activity that the caller can
see (see [Visibility](#visibility)), sorted by name:
`[ { "id": 1, "name": "Biology" } ]`. The themes used only by other
users' private activities are not listed.

### `GET /api/courses`

Returns the courses in the same way and format.

## Revision activities

### Visibility

Each activity is `private` or `public`:

- A **private** activity belongs to the user who created it. Only that
  user sees it, in the list and by id; for anyone else, including
  admins, it does not exist (`404`).
- A **public** activity has no owner and everyone sees it, including
  visitors who are not signed in. Only the users with the
  `publish-activities` permission can create one.

### Activity summary (list)

```json
{
  "id": 1,
  "title": "Cell biology",
  "description": "Chapter 3",
  "themes": [ { "id": 1, "name": "Biology" }, { "id": 2, "name": "Cells" } ],
  "courses": [ { "id": 3, "name": "BIO 101" } ],
  "visibility": "public",
  "moduleCount": 2,
  "createdAt": "2026-09-23T03:06:18.742923Z",
  "updatedAt": "2026-09-23T03:06:18.742923Z"
}
```

### Activity (with modules)

```json
{
  "id": 1,
  "title": "Cell biology",
  "description": "Chapter 3",
  "themes": [ { "id": 1, "name": "Biology" } ],
  "courses": [ { "id": 3, "name": "BIO 101" } ],
  "visibility": "private",
  "modules": [
    { "id": 1, "position": 0, "type": "reading", "content": { "title": "Introduction", "body": "..." } }
  ],
  "createdAt": "2026-09-23T03:06:18.742923Z",
  "updatedAt": "2026-09-23T03:06:18.742923Z",
  "canEdit": true,
  "lastEditedBy": null
}
```

`canEdit` tells whether the caller can edit and delete the activity (see
[`PUT`](#put-apiactivitiesid)). `lastEditedBy` (`{ "id": 4, "displayName":
"Grace" }`) is the user who created or last edited the activity; it is
only given for a public activity, to the people who can edit it, and is
`null` otherwise (and for the seed activities).

Themes and courses are sorted by name. Modules are sorted by `position` (starting at
0). `description` can be `null`. The structure of `content` depends on
the module `type` (see [Module types](#module-types)).

### `GET /api/activities`

Returns one page of the activity summaries that the caller can see and
that match the filters, newest first.

| Parameter  | Default | Rules              |
|------------|---------|--------------------|
| `page`     | `1`     | at least 1         |
| `pageSize` | `20`    | between 1 and 100  |
| `title`    | none    | at most 200 characters |
| `courseId` | none    | a course id        |
| `themeIds` | none    | theme ids, repeated: `themeIds=1&themeIds=4` (at most 20) |
| `visibility` | none  | `private` or `public` |

Each filter that is set narrows the result; an activity is listed only if
it matches all of them:

- `title`: the title contains this text, ignoring case and accents.
  Surrounding spaces are removed and a blank value is ignored.
- `courseId`: the activity is part of this course.
- `themeIds`: the activity has **all** these themes.
- `visibility`: the activity has this visibility. `private` returns the
  caller's own private activities (nothing for a visitor).

A course id is not a theme id and the reverse: an unknown id, or the id
of a theme passed as `courseId`, matches no activity.

Example: `GET /api/activities?title=cell&courseId=3&themeIds=1&page=2`

```json
{
  "items": [ /* activity summaries */ ],
  "page": 2,
  "pageSize": 20,
  "totalCount": 45
}
```

`totalCount` is the number of activities on all pages. A page after the
last one returns an empty `items` list. An invalid parameter returns
`400` with the validation errors keyed by parameter name.

### `GET /api/activities/{id}`

Returns one activity with its modules, or `404` if it does not exist or
is another user's private activity.

### `POST /api/activities`

Requires a signed-in user (`401` otherwise). Creates an activity with its
modules and returns `201` with the created activity and a `Location`
header.

```json
{
  "title": "Cell biology",
  "description": "Chapter 3",
  "themes": ["Biology", "Cells"],
  "courses": ["BIO 101"],
  "visibility": "private",
  "modules": [
    { "type": "reading", "content": { "title": "Introduction", "body": "..." } }
  ]
}
```

- `title`: required, at most 200 characters. Surrounding spaces are removed.
- `description`: optional, at most 2000 characters. A blank description is stored as `null`.
- `themes`: at least one name, each non-blank and at most 100 characters.
  An existing theme with the same name, ignoring case, is reused (keeping
  its original spelling). Duplicate names in the request are merged.
- `courses`: optional, the courses the activity is part of (any number).
  Same rules as `themes` for each name. Courses do not count as themes:
  a course and a theme can have the same name and are still different.
- `visibility`: optional, `private` (the default) or `public`. A private
  activity belongs to the caller. A public activity has no owner and
  needs the `publish-activities` permission: without it, the request
  returns `403` and nothing is created.
- `modules`: at least one module. Each module needs a known `type` and a
  `content` that is valid for that type. Modules are stored in the order
  of the list.

Invalid requests return `400` with the errors by field. Module errors
use the module's index, e.g. `modules[1].content`:

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "title": ["The title is required."],
    "modules[1].content": ["The text to read is required."]
  }
}
```

A module of a new activity cannot have an `id` (`modules[0].id`).

### `PUT /api/activities/{id}`

Replaces an activity and returns `200` with the updated activity. The
body is the same as for `POST`, with the same rules, except for:

- `modules[].id`: optional. A module with the `id` of one of the
  activity's modules updates that module, which **keeps its id**; a
  module without `id` is new; the activity's modules missing from the
  list are deleted. The order of the list gives the new positions. An id
  that is not one of the activity's modules (`modules[i].id`), the same
  id twice (`modules[i].id`) or a change of the type of an existing
  module (`modules[i].type`) returns `400`. To change a module's type,
  remove it and add a new one.
- `visibility`: optional; when missing, the visibility does not change.
  Changing it needs the `publish-activities` permission (`403`
  otherwise). A public activity has no owner; an activity made private
  belongs to the user who changed it.

Who can edit:

| Activity | Its owner | Admin | Other users | Visitor |
|---|---|---|---|---|
| Private | ✅ | `404` (not theirs) | `404` | `401` |
| Public | – | ✅ (`manage-public-activities`) | `403` | `401` |

The activity records who edited it last (`lastEditedBy`).

### `DELETE /api/activities/{id}`

Deletes the activity for good, with its modules and its links to themes
and courses, and returns `204`. The same people who can edit an activity
can delete it, with the same answers otherwise (`401`, `403`, `404`).

## Module types

### `reading`

A text to read.

```json
{ "title": "Introduction", "body": "The cell is the basic unit of life..." }
```

- `title`: optional, at most 200 characters; a blank title is stored as `null`.
- `body`: required, at most 20000 characters.

Surrounding spaces are removed from both.

### `multiple-choice`

A question with 2 to 10 choices, one or more of which are correct, and
an optional explanation shown after answering.

```json
{
  "question": "What is a cell?",
  "choices": [
    { "id": "c1", "text": "The basic unit of life" },
    { "id": "c2", "text": "A planet" }
  ],
  "correctChoiceIds": ["c1"],
  "explanation": "All living organisms are made of cells."
}
```

- `question`: required, at most 1000 characters.
- `choices`: 2 to 10 choices. Each `id` is required, unique within the
  question and at most 50 characters; each `text` is required and at
  most 500 characters.
- `correctChoiceIds`: at least one id, each matching a choice. They are
  stored without duplicates, in the order of the choices.
- `explanation`: optional, at most 2000 characters; a blank explanation
  is stored as `null`.

Surrounding spaces are removed from all texts and ids.

Grading (in the browser): the answer is correct, 1 out of 1, only if the
learner selects exactly the correct choices; otherwise 0 out of 1.

### `matching`

Concepts to match with their definitions, with optional instructions.

```json
{
  "instructions": "Match each process with its definition.",
  "pairs": [
    { "id": "p1", "concept": "Mitosis", "definition": "Division into two identical cells" },
    { "id": "p2", "concept": "Meiosis", "definition": "Division producing gametes" }
  ]
}
```

- `instructions`: optional, at most 500 characters; blank instructions
  are stored as `null`.
- `pairs`: 2 to 10 pairs. Each `id` is required, unique within the module
  and at most 50 characters. Each `concept` (at most 200 characters) and
  each `definition` (at most 1000 characters) is required and must be
  different from the others in the module, ignoring case, so that every
  match is unambiguous.

Surrounding spaces are removed from all texts and ids.

Grading (in the browser): one point per concept matched with its
definition, out of the number of pairs (e.g. 2 out of 3).
