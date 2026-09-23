# API

All endpoints are under `/api`. Requests and responses use JSON with
camelCase property names. Timestamps are in UTC (ISO 8601).

In development, Swagger UI at `http://localhost:5044/swagger` lists the
endpoints and can call them.

## Health

`GET /api/health` returns `200` with the text `Healthy`.

## Revision activities

### Activity object

```json
{
  "id": 1,
  "title": "Cell biology",
  "description": "Chapter 3",
  "themes": [ { "id": 1, "name": "Biology" }, { "id": 2, "name": "Cells" } ],
  "createdAt": "2026-09-23T03:06:18.742923Z",
  "updatedAt": "2026-09-23T03:06:18.742923Z"
}
```

Themes are sorted by name. `description` can be `null`.

### `GET /api/activities`

Returns all activities, newest first.

### `GET /api/activities/{id}`

Returns one activity, or `404` if it does not exist.

### `POST /api/activities`

Creates an activity and returns `201` with the created activity and a
`Location` header.

```json
{ "title": "Cell biology", "description": "Chapter 3", "themes": ["Biology", "Cells"] }
```

- `title`: required, at most 200 characters. Surrounding spaces are removed.
- `description`: optional, at most 2000 characters. A blank description is stored as `null`.
- `themes`: at least one name, each non-blank and at most 100 characters.
  An existing theme with the same name, ignoring case, is reused (keeping
  its original spelling). Duplicate names in the request are merged.

Invalid requests return `400` with the errors by field:

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "title": ["The title is required."] }
}
```
