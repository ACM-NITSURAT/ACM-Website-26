# Firestore Database Schema

ACM SVNIT — `acm-nit-surat` project.

> TypeScript source lives in `src/schema/`. Import from the barrel:
> ```ts
> import type { User, Event, Participant } from '@/schema';
> ```

---

## Collections overview

```
/users/{userId}
/events/{eventId}
    ├── /participants/{participantId}
    └── /form/config
/dict/executives
```

---

## 1. `/users/{userId}`

**File:** `src/schema/user.ts`

Document ID = Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Mirrors the Firestore document ID (Auth UID) |
| `firstName` | `string` | |
| `lastName` | `string` | |
| `email` | `string` | |
| `rollNumber` | `string` | Everything before `@` in the email |
| `gender` | `'male' \| 'female' \| 'other'` | |
| `profileImageUrl` | `string` | Public download URL |
| `role` | `'member' \| 'executive' \| 'core' \| 'adviser'` | |
| `position` | `CorePosition \| null` | Non-null only when `role === 'core'` |
| `isOnboardingCompleted` | `boolean` | Defaults `false`; set `true` after onboarding form |
| `isSuperAdmin` | `boolean` | Defaults `false` |
| `registrationTimestamp` | `Timestamp` | |

`CorePosition` values: `Chairperson`, `Vice Chairperson`, `Secretary`, `Developer`, `Community Head`, `Designer`, `Treasurer`, `Social Media Manager`, `Core Member`.

---

## 2. `/events/{eventId}`

**File:** `src/schema/event.ts`

Document ID = Firestore auto-generated hash (never changes). `slug` is the human-readable public identifier.

### Core fields

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Firestore doc ID |
| `slug` | `string` | URL identifier used in event links. Unique, admin-editable |
| `eventName` | `string` | |
| `eventDescription` | `string` | |
| `status` | `'upcoming' \| 'ongoing' \| 'finished'` | |
| `eventThumbnail` | `string` | Public URL. Falls back to `/event-placeholder.jpg` |
| `type` | `'event' \| 'workshop' \| 'meet'` | |
| `location` | `string` | |
| `tags` | `string[]` | |
| `isOpenToAll` | `boolean` | `true` → non-ACM members may register |
| `unregisteredForm` | `boolean` | `true` → anonymous participation, no Firebase auth needed |
| `isFormOpen` | `boolean` | Registration form gate. Defaults `false`; admin must open explicitly |
| `hasForm` | `boolean` | `true` once a form is saved via the form builder. `isFormOpen` toggle hidden until `true` |
| `maxParticipants` | `number` | `0` = unlimited |
| `startDate` | `Timestamp` | |
| `endDate` | `Timestamp` | |
| `creationDate` | `Timestamp` | Server-set on creation |
| `totalParticipants` | `number` | Denormalised counter, incremented via transaction |

### Team configuration

| Field | Type | Notes |
|---|---|---|
| `isTeamEvent` | `boolean` | `true` → team-based registration |
| `totalTeams` | `number` | Denormalised team count |
| `minTeamMembers` | `number` | |
| `maxTeamMembers` | `number` | |

### Diversity constraints

| Field | Type | Notes |
|---|---|---|
| `isFemaleMandatory` | `boolean` | At least `minFemaleRequired` female members required |
| `minFemaleRequired` | `number` | |

### Prize configuration

| Field | Type | Notes |
|---|---|---|
| `prizeMoney` | `number` | Total pool in INR. `0` = no prize |
| `prizeMoneyDistribution` | `PrizeMoneyDistribution` | `{ firstPrize, secondPrize, thirdPrize }` in INR |

### `isFormOpen` behaviour

- Defaults `false` on event creation.
- Admin toggles it from the event detail page.
- The registration API (`POST /api/event/[slug]/form`) returns 403 when `false`.
- Orthogonal to `status` — an `upcoming` event can have the form open, a `finished` event cannot accept registrations regardless.

### Inconsistent state warning

`isOpenToAll=false` + `unregisteredForm=true` is a logically invalid combination (role cannot be verified without auth). The registration API rejects submissions for this combination with 409.

---

## 3. `/events/{eventId}/participants/{participantId}`

**File:** `src/schema/participant.ts`

All registrations share a single flat shape. `isTeam` indicates team vs individual (for display), but no typed identity fields exist at the top level — everything beyond submitter identity goes into `extraFields`.

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Firestore doc ID |
| `isTeam` | `boolean` | `true` for team events |
| `submitter` | `SubmitterInfo \| null` | `null` when `unregisteredForm=true` |
| `attended` | `boolean` | Physical check-in |
| `registrationTimestamp` | `Timestamp` | |
| `extraFields` | `Record<string, unknown>` | All form responses, keyed by `FormField.id` |

### `SubmitterInfo`

Denormalised from `/users/{uid}` at registration time. Present only when `unregisteredForm=false`.

| Field | Type |
|---|---|
| `userId` | `string` |
| `name` | `string` |
| `rollNumber` | `string` |

### `extraFields`

Contains every response the user submitted — both custom form fields (keyed by UUID) and default identity fields when `includeDefaultFields=true` on the form config (e.g. firstName, rollNumber, teamName, members array).

---

## 4. `/events/{eventId}/form/config`

**File:** `src/schema/form.ts`

Single document per event. Doc ID always `"config"`.

| Field | Type | Notes |
|---|---|---|
| `eventId` | `string` | Parent event's Firestore doc ID |
| `title` | `string` | Form heading (TipTap HTML) |
| `description` | `string` | Subtitle (TipTap HTML) |
| `includeDefaultFields` | `boolean` | When `true`, default identity fields (name, roll, gender / team info) are shown on the registration page and included in submissions. Defaults `false`. |
| `fields` | `FormField[]` | Ordered list. Min 1 non-paragraph field, max `FORM_MAX_FIELDS` (50) |
| `afterScreen` | `AfterScreen \| null` | Confirmation screen after submission |
| `createdAt` | `Timestamp` | Set on first save |
| `updatedAt` | `Timestamp` | Updated on every save |

### `FormField` union (discriminated on `type`)

| `type` | Extra fields | Notes |
|---|---|---|
| `text` | — | Short text |
| `email` | — | Email format validated |
| `mobile` | — | 10-digit Indian number |
| `rollNumber` | — | `U24CS089` format |
| `url` | — | `http(s)://` required |
| `dropdown` | `options: string[]` | Single select |
| `checkbox` | `options: string[]` | Multi-select |
| `paragraph` | `content: string` | Display-only rich text (TipTap HTML). Not collected in `extraFields`. |

All input fields share: `id` (stable UUID), `label`, `required: boolean`, `order: number`.

### `AfterScreen`

| Field | Type |
|---|---|
| `heading` | `string` |
| `body` | `string` (TipTap HTML) |

### `includeDefaultFields` behaviour

- `false` (default) — form shows only admin-defined fields. The system only stores `submitter` identity (from auth token) plus `extraFields`. No identity fields are required or validated in the request body.
- `true` — the registration page prepends built-in fields (individual: first name, last name, roll number, gender; team: team name, leader info, members). These are validated and stored inside `extraFields` using their form field UUIDs.

---

## 5. `/dict/executives`

**File:** `src/schema/dict.ts`

| Field | Type | Notes |
|---|---|---|
| `emails` | `string[]` | Lowercase emails that receive `role: 'executive'` on sign-in |

Role is re-evaluated on every sign-in. See `docs/authorization.md`.

- **Anonymous submissions** — `submitter` is `null` only when `unregisteredForm=true`. No identity is stored or required.
- **`extraFields`** — keyed by `FormField.id` (UUID). Contains all form responses plus any default-field data when `includeDefaultFields=true`. Orphaned keys from deleted fields are ignored.


---

## Design notes

- **Denormalised counters** — `totalParticipants` and `totalTeams` are incremented inside a Firestore transaction to prevent race conditions.
- **Thumbnail** — `1280×720` (16:9). Defined in `src/config/index.ts`.
- **Roll number format** — `[A-Za-z]\d{2}[A-Za-z]{2}\d{3}` (e.g. `U24CS089`). Validator: `src/lib/validators/rollNumber.ts`. Shared isomorphic validation: `src/lib/validators/form-fields.ts`.
- **Public routes** — `/events` and `/events/*` are publicly accessible without auth. See `src/config/routes.ts`.
- **Toggle constraint** — `isOpenToAll=false` + `unregisteredForm=true` is invalid. The event form builder enforces this automatically (turning on `unregisteredForm` also forces `isOpenToAll=true`).
