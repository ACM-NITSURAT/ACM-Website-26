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
    └── /participants/{participantId}
```

---

## 1. `/users/{userId}`

**File:** `src/schema/user.ts`

The document ID is the Firebase Auth UID of the account owner.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Mirrors the Firestore document ID (Auth UID) |
| `firstName` | `string` | |
| `lastName` | `string` | |
| `email` | `string` | |
| `rollNumber` | `string` | Institutional roll number, e.g. `"22CE001"` |
| `gender` | `'male' \| 'female' \| 'other'` | |
| `profileImageUrl` | `string` | Public download URL |
| `role` | `'member' \| 'executive' \| 'core' \| 'adviser'` | ACM SVNIT organisational role |
| `isSuperAdmin` | `boolean` | Unrestricted platform access. Defaults to `false` |
| `registrationTimestamp` | `Timestamp` | UTC time of account creation |

### Role hierarchy

```
adviser  ──┐
core     ──┤  (privileged)
executive ─┤
member   ──┘  (base)
```

`isSuperAdmin` is orthogonal to `role` — a member could technically be a super-admin, though in practice it is only set on core/adviser accounts.

---

## 2. `/events/{eventId}`

**File:** `src/schema/event.ts`

The document ID is either a human-readable slug (e.g. `"hackathon-2025"`) or a Firestore auto-ID.

### Core fields

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Document ID |
| `eventName` | `string` | Display name |
| `eventDescription` | `string` | Full description / body copy |
| `status` | `'upcoming' \| 'ongoing' \| 'finished'` | Lifecycle state |
| `eventThumbnail` | `string` | Public URL for cover image |
| `type` | `'event' \| 'workshop' \| 'meet'` | Format classification |
| `location` | `string` | e.g. `"Online"`, `"Computer Dept. Seminar Hall"` |
| `tags` | `string[]` | Topic tags, e.g. `["AI", "Web3", "CP"]` |
| `isOpenToAll` | `boolean` | `true` → non-ACM members may register |
| `unregisteredForm` | `boolean` | `true` → anonymous participation via external form |
| `maxParticipants` | `number` | Hard registration cap |
| `startDate` | `Timestamp` | UTC event start |
| `endDate` | `Timestamp` | UTC event end |
| `creationDate` | `Timestamp` | UTC document creation time |
| `totalParticipants` | `number` | Denormalised running count (increment on each registration) |

### Team configuration

These fields are only meaningful when `isTeamEvent === true`. When `false`, set `totalTeams`, `minTeamMembers`, `maxTeamMembers` to `0`.

| Field | Type | Notes |
|---|---|---|
| `isTeamEvent` | `boolean` | `true` → participants register as teams |
| `totalTeams` | `number` | Denormalised running count of registered teams |
| `minTeamMembers` | `number` | Minimum members to form a valid team |
| `maxTeamMembers` | `number` | Maximum members allowed per team |

### Diversity constraints

| Field | Type | Notes |
|---|---|---|
| `isFemaleMandatory` | `boolean` | `true` → at least one female member required |
| `minFemaleRequired` | `number` | Minimum female participants per team/registration |

> When `isFemaleMandatory === false`, `minFemaleRequired` should be `0` but is not enforced at the schema level — enforce in application logic or Security Rules.

### Prize configuration

| Field | Type | Notes |
|---|---|---|
| `prizeMoney` | `number` | Total prize pool in INR (₹). Set to `0` if no prize money |
| `prizeMoneyDistribution` | `PrizeMoneyDistribution` | Breakdown across top three positions |

#### `PrizeMoneyDistribution` shape

| TS key | Firestore key | Type | Notes |
|---|---|---|---|
| `firstPrize` | `first-prize` | `number` | INR value for 1st place. `0` if unused |
| `secondPrize` | `second-prize` | `number` | INR value for 2nd place. `0` if unused |
| `thirdPrize` | `third-prize` | `number` | INR value for 3rd place. `0` if unused |

> **Key naming:** Firestore stores these with hyphens (`first-prize`). The TypeScript interface uses camelCase because hyphens are not valid in identifier names. When writing raw Firestore data use the hyphenated keys; the typed SDK handles this transparently via the field mapping.

All three keys are always present in the document. For events with no prize money, set `prizeMoney: 0` and all three distribution values to `0`.

---

## 3. `/events/{eventId}/participants/{participantId}`

**File:** `src/schema/participant.ts`

This subcollection is **polymorphic** — a single document can represent either an individual registration or a full team. The `isTeam` boolean is the discriminant used to narrow the TypeScript type.

```
Participant  (union type)
  ├── IndividualParticipant  (isTeam: false)
  └── TeamParticipant        (isTeam: true)
```

### Common base fields (both variants)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Document ID |
| `attended` | `boolean` | Physical check-in / attendance status |
| `registrationTimestamp` | `Timestamp` | UTC time of registration |
| `isTeam` | `boolean` | Discriminant — determines the document shape |
| `extraFields` | `Record<string, unknown>` | Catch-all for dynamic fields from custom web forms |

### `IndividualParticipant` — when `isTeam === false`

| Field | Type | Notes |
|---|---|---|
| `userId` | `string \| null` | Firebase Auth UID, or `null` for anonymous submissions |
| `firstName` | `string` | |
| `lastName` | `string` | |
| `rollNumber` | `string` | |

`userId` is `null` when the parent event has `unregisteredForm: true` and the person did not sign in.

### `TeamParticipant` — when `isTeam === true`

| Field | Type | Notes |
|---|---|---|
| `teamName` | `string` | |
| `teamSize` | `number` | Actual member count at registration time |
| `leaderId` | `string \| null` | Auth UID of the leader, or `null` for anonymous |
| `leaderName` | `string` | |
| `leaderRollNumber` | `string` | |
| `members` | `TeamMember[]` | All team members including the leader |

#### `TeamMember` shape

| Field | Type | Notes |
|---|---|---|
| `userId` | `string \| null` | Auth UID or `null` for anonymous |
| `name` | `string` | Full display name |
| `rollNumber` | `string` | |
| `gender` | `'male' \| 'female' \| 'other'` | Used for diversity constraint validation |

### Narrowing the union in code

```ts
import type { Participant } from '@/schema';

function handle(p: Participant) {
  if (p.isTeam) {
    // p is TeamParticipant — p.members, p.teamName, etc. are available
    console.log(p.teamName, p.members.length);
  } else {
    // p is IndividualParticipant — p.firstName, p.userId, etc. are available
    console.log(p.firstName, p.userId);
  }
}
```

---

## Design notes

### Denormalised counters
`totalParticipants` and `totalTeams` on the `Event` document are written at registration time to avoid expensive `COUNT` queries on the subcollection. Use a Firestore `increment()` transaction when writing a new participant document.

```ts
import { increment, runTransaction, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

await runTransaction(db, async (tx) => {
  const eventRef = doc(db, 'events', eventId);
  tx.set(participantRef, participantData);
  tx.update(eventRef, { totalParticipants: increment(1) });
});
```

### Anonymous participants
Both `IndividualParticipant.userId` and `TeamParticipant.leaderId` / `TeamMember.userId` are typed as `string | null`. `null` is only valid when the parent event has `unregisteredForm: true`. Enforce this constraint in your registration logic, not the schema.

### `extraFields`
Typed as `Record<string, unknown>` (not `any`). Always narrow before use:

```ts
const value = participant.extraFields['tShirtSize'];
if (typeof value === 'string') {
  // safe to use value as string
}
```

### Timestamp import
All schema files import `Timestamp` from `src/schema/firestore.ts`, which re-exports it from `firebase/firestore`. This keeps the import path stable across the codebase.

```ts
import { Timestamp } from 'firebase/firestore';

// Creating a timestamp
const now = Timestamp.now();
const fromDate = Timestamp.fromDate(new Date('2025-09-01'));
```
