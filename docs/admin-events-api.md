# Admin Events API

CRUD endpoints for event management. All routes require a valid Firebase ID token.

```
Authorization: Bearer <idToken>
```

---

## Admin CRUD endpoints

All require `manageEvents` permission (core, adviser) unless noted.

### `POST /api/admin/events` — Create event
- **Body**: Event fields per schema
- **Returns**: `{ id, slug, ...event }` — 201
- `isFormOpen` always defaults to `false` on creation. Admin must explicitly open.
- `slug` auto-generated from `eventName` if omitted. Must be unique (409 on conflict).

### `GET /api/admin/events` — List all events
- **Permission**: `viewEvents` (all roles)
- **Returns**: `{ events: Event[] }` ordered by `creationDate` desc

### `GET /api/admin/events/[slug]` — Fetch one event
- **Permission**: `viewEvents` (all roles)
- **Returns**: Single event document

### `PATCH /api/admin/events/[slug]` — Edit event
- **Body**: Any subset of editable fields
- Read-only fields ignored if sent: `id`, `creationDate`, `totalParticipants`, `totalTeams`
- Merges with existing doc before running cross-field validation
- Slug rename: send `slug` in body — must be unique (409 on conflict)
- Use this endpoint to toggle `isFormOpen`: `{ isFormOpen: true }`

### `DELETE /api/admin/events/[slug]` — Delete event
- **Returns**: `{ success: true }`

---

## Form builder API

### `GET /api/admin/events/[slug]/form` — Fetch form schema
- **Permission**: `viewEvents` (all roles)
- **Returns**: `EventForm` document or 404 if not created yet

### `PUT /api/admin/events/[slug]/form` — Create or overwrite form
- **Permission**: `manageEvents` (core, adviser)
- **Body**: `{ title, description, fields: FormField[], afterScreen?, includeDefaultFields? }`
- `title` and `description` are stored as TipTap HTML strings
- `afterScreen`: `{ heading: string, body: string }` (body is TipTap HTML) — optional, shown after submission
- `includeDefaultFields`: boolean, defaults `false` — controls whether default identity fields appear on the registration page
- `paragraph` fields are allowed; must have at least 1 non-paragraph input field
- Validates schema before saving (min 1 input field, max 50 total, unique labels, non-empty options)
- Sets `hasForm=true` on the event doc on first save
- Blocked for event types in `EVENT_TYPES_WITHOUT_FORMS`

### `DELETE /api/admin/events/[slug]/form` — Delete form
- **Permission**: `manageEvents` (core, adviser)
- Resets `hasForm=false` and `isFormOpen=false` on the event doc

---

## Participants API

### `GET /api/admin/events/[slug]/participants` — List participants
- **Permission**: `viewEvents`
- **Returns**: `{ participants: Participant[], form: EventForm | null }`
- `form` is included so the client can resolve `extraFields` UUID keys to human-readable labels

### `GET /api/admin/events/[slug]/participants/csv` — Export CSV
- **Permission**: `viewEvents`
- **Returns**: `text/csv` file attachment
- Columns: `ID, Registered At, [Submitter Name, Submitter Roll, Submitter User ID,] Attended, <custom field labels...>`
- Submitter identity columns are only included when `form.includeDefaultFields=true`
- Ordered by `registrationTimestamp` ascending
- Filename: `{slug}-participants-{date}.csv`

---

## Registration endpoint (public)

### `POST /api/event/[slug]/form` — Submit registration

No admin permission required. Auth depends on event config.

#### Gate checks (in order)

1. Event not found → 404
2. `isFormOpen === false` → 403
3. `status === 'finished'` → 403
4. `isOpenToAll=false` + `unregisteredForm=true` (invalid config) → 409
5. Event type in `EVENT_TYPES_WITHOUT_FORMS` → 400

#### Auth rules

| Event config | Token required |
|---|---|
| `unregisteredForm=true` | No — `submitter` stored as `null` |
| `unregisteredForm=false` | Yes — `Authorization: Bearer <token>` |
| `isOpenToAll=false` | Yes + role must be `executive` / `core` / `adviser` |

#### Request body

```json
{ "extraFields": { "<fieldUUID>": "value" } }
```

When `includeDefaultFields=true` on the form config, default identity fields (e.g. `firstName`, `rollNumber`, `teamName`, `members`) should also be included at the top level.

#### `extraFields` validation (via `src/lib/validators/form-fields.ts`)

- Required fields must be non-empty (trimmed)
- `email` → valid email format
- `mobile` → 10-digit Indian number
- `rollNumber` → `U24CS089` format
- `url` → `http(s)://` required
- `dropdown` → value must be in `options[]`
- `checkbox` → all values must be in `options[]`
- `paragraph` fields skipped (display-only)

Same validators run on client and server.

#### Duplicate prevention

- `unregisteredForm=false` → duplicate check by `submitter.userId`
- `unregisteredForm=true` → no duplicate check

#### Counter increments (transaction)

- Individual: `totalParticipants += 1`
- Team: `totalTeams += 1`, `totalParticipants += 1`

#### Returns

```json
{ "participantId": "<doc-id>" }
```
201 on success.

---

## ID vs Slug

| Field | Description | Mutable |
|---|---|---|
| `id` | Firestore auto-generated hash | Never |
| `slug` | URL identifier for event links `/events/{slug}` | Yes, via PATCH |

---

## Required fields for POST

`eventName`, `eventDescription`, `type`, `location`, `startDate`, `endDate`

## Field defaults on POST

| Field | Default |
|---|---|
| `status` | `"upcoming"` |
| `isFormOpen` | `false` |
| `hasForm` | `false` |
| `eventThumbnail` | `""` |
| `tags` | `[]` |
| `isOpenToAll` | `false` |
| `unregisteredForm` | `false` |
| `maxParticipants` | `0` (unlimited) |
| `isTeamEvent` | `false` |
| `minTeamMembers` | `1` |
| `maxTeamMembers` | `1` |
| `isFemaleMandatory` | `false` |
| `minFemaleRequired` | `0` |
| `prizeMoney` | `0` |
| `prizeMoneyDistribution` | `{ firstPrize: 0, secondPrize: 0, thirdPrize: 0 }` |

## Validation rules (POST and PATCH)

- `status === 'upcoming'` → `startDate` must be in the future
- `status === 'ongoing'` → `startDate` in past, `endDate` in future
- `status === 'finished'` → `endDate` in the past
- `endDate` must be after `startDate`
- Prize distribution sum must be ≤ `prizeMoney`
- `minTeamMembers` ≤ `maxTeamMembers`
- `minFemaleRequired` ≤ `maxTeamMembers`

Shared validation logic: `src/server/event-validators.ts`

---

## Error responses

| Status | Reason |
|---|---|
| 400 | Missing/invalid field |
| 401 | Missing or invalid token |
| 403 | Insufficient permission or form closed |
| 404 | Event or participant not found |
| 409 | Slug conflict, duplicate registration, or invalid event config |
| 422 | Business rule violation (dates, prizes, team size) |

---

## Implementation files

| File | Purpose |
|---|---|
| `src/app/api/admin/events/route.ts` | POST (create), GET (list) |
| `src/app/api/admin/events/[slug]/route.ts` | GET, PATCH, DELETE by slug |
| `src/app/api/admin/events/[slug]/form/route.ts` | Form schema CRUD (GET, PUT, DELETE) |
| `src/app/api/admin/events/[slug]/participants/route.ts` | Participants list |
| `src/app/api/admin/events/[slug]/participants/csv/route.ts` | CSV export |
| `src/app/api/event/[slug]/form/route.ts` | Public registration endpoint |
| `src/app/api/event/[slug]/registration-status/route.ts` | Check if user already registered |
| `src/server/guard.ts` | Auth + permission guard helper |
| `src/server/event-validators.ts` | Shared date/prize/team validation |
| `src/lib/form-builder/validate-schema.ts` | Form schema validation (save) |
| `src/lib/form-builder/validate-response.ts` | Form response validation (registration) |
| `src/lib/validators/form-fields.ts` | Isomorphic field validators (client + server) |
| `src/lib/firebase/admin-api.ts` | Client-side API helpers (admin panel) |
| `src/schema/event.ts` | Event TypeScript interface |
| `src/schema/form.ts` | Form and FormField TypeScript interfaces |
| `src/schema/participant.ts` | Participant TypeScript interface |
| `src/server/event-validators.ts` | Shared date/prize/team validation |
| `src/lib/form-builder/validate-schema.ts` | Form schema validation (save) |
| `src/lib/form-builder/validate-response.ts` | Form response validation (registration) |
| `src/lib/validators/rollNumber.ts` | Roll number format validator |
| `src/lib/firebase/admin-api.ts` | Client-side API helpers (admin panel) |
| `src/schema/event.ts` | Event TypeScript interface |
| `src/schema/form.ts` | Form and FormField TypeScript interfaces |
| `src/schema/participant.ts` | Participant TypeScript interfaces |
