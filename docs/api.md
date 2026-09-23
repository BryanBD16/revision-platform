# API

All endpoints are under `/api`. Requests and responses use JSON with
camelCase property names. Timestamps are in UTC (ISO 8601).

In development, Swagger UI at `http://localhost:5044/swagger` lists the
endpoints and can call them.

## Health

`GET /api/health` returns `200` with the text `Healthy`.

## Revision activities

### Activity summary (list)

```json
{
  "id": 1,
  "title": "Cell biology",
  "description": "Chapter 3",
  "themes": [ { "id": 1, "name": "Biology" }, { "id": 2, "name": "Cells" } ],
  "courses": [ { "id": 3, "name": "BIO 101" } ],
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
  "modules": [
    { "id": 1, "position": 0, "type": "reading", "content": { "title": "Introduction", "body": "..." } }
  ],
  "createdAt": "2026-09-23T03:06:18.742923Z",
  "updatedAt": "2026-09-23T03:06:18.742923Z"
}
```

Themes and courses are sorted by name. Modules are sorted by `position` (starting at
0). `description` can be `null`. The structure of `content` depends on
the module `type` (see [Module types](#module-types)).

### `GET /api/activities`

Returns one page of the activity summaries that match the filters,
newest first.

| Parameter  | Default | Rules              |
|------------|---------|--------------------|
| `page`     | `1`     | at least 1         |
| `pageSize` | `20`    | between 1 and 100  |
| `title`    | none    | at most 200 characters |
| `courseId` | none    | a course id        |
| `themeIds` | none    | theme ids, repeated: `themeIds=1&themeIds=4` (at most 20) |

Each filter that is set narrows the result; an activity is listed only if
it matches all of them:

- `title`: the title contains this text, ignoring case and accents.
  Surrounding spaces are removed and a blank value is ignored.
- `courseId`: the activity is part of this course.
- `themeIds`: the activity has **all** these themes.

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

Returns one activity with its modules, or `404` if it does not exist.

### `POST /api/activities`

Creates an activity with its modules and returns `201` with the created
activity and a `Location` header.

```json
{
  "title": "Cell biology",
  "description": "Chapter 3",
  "themes": ["Biology", "Cells"],
  "courses": ["BIO 101"],
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
