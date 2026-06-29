# Authorization

ACM SVNIT — `acm-nit-surat` project.

---

## Role hierarchy

```
member  <  executive  <  core
```

`adviser` is independent — no inherited hierarchy. Permissions assigned explicitly.

| Role | How assigned |
|---|---|
| `member` | Default for all new accounts |
| `executive` | Email in `/dict/executives` — re-checked on every sign-in |
| `core` | Manual only — set directly in Firestore |
| `adviser` | Manual only — set directly in Firestore |

`isSuperAdmin` is a separate Firestore boolean, never in JWT claims. Always read server-side.

---

## JWT Custom Claims

Role is stored as a Firebase custom claim:

```json
{ "role": "member" }
```

- Written by Admin SDK only (`setCustomUserClaims`). Client cannot forge it.
- Client reads via `user.getIdTokenResult()` — no Firestore lookup.
- Every Route Handler verifies via `verifyIdToken()` before trusting any claim.
- Token lifetime: 1 hour. Demotion takes effect on next sign-in (accepted trade-off).

---

## Sign-in flow

```
Client                            Server
──────                            ──────
1. Firebase sign-in (email/Google)
2. getIdToken()  ───────────────▶  POST /api/auth/session
                                     verifyIdToken()
                                     syncUser()
                                       ├─ first sign-in: create /users/{uid}
                                       ├─ every sign-in: re-check /dict/executives
                                       └─ setCustomUserClaims({ role })
        ◀──────────────────────── { role, isOnboardingCompleted }
3. getIdToken(true)  ← force-refresh JWT
4. useAuth() reads role from token
```

---

## Permissions index

**File:** `src/server/permissions.ts`

```ts
import { can } from '@/server/permissions';
if (!can(role, 'manageEvents')) return Response.json({ error: 'Forbidden' }, { status: 403 });
```

### Current permission map

| Permission | member | executive | core | adviser |
|---|:---:|:---:|:---:|:---:|
| `viewEvents` | ✓ | ✓ | ✓ | ✓ |
| `registerForOpenToAllEvents` | ✓ | ✓ | ✓ | ✓ |
| `registerForEvent` | | ✓ | ✓ | ✓ |
| `manageEvents` | | | ✓ | ✓ |
| `viewAllUsers` | | | ✓ | ✓ |
| `markAttendance` | | | ✓ | ✓ |

---

## Registration API authorization

**File:** `src/app/api/event/[slug]/form/route.ts`

| Event config | Auth requirement |
|---|---|
| `unregisteredForm=true` | No token. `submitter` stored as `null`. No identity captured. |
| `unregisteredForm=false` + `isOpenToAll=true` | Valid token required. Any authenticated user (including `member`) can register. |
| `unregisteredForm=false` + `isOpenToAll=false` | Valid token required + role must be `executive`, `core`, or `adviser`. |
| `isOpenToAll=false` + `unregisteredForm=true` | **Invalid state** — API returns 409. UI prevents this combination. |

When authenticated, submitter identity (`userId`, `name`, `rollNumber`) is fetched from `/users/{uid}` and stored on the participant doc as `submitter`. Never taken from the request body.

---

## Auth guard helper

**File:** `src/server/guard.ts`

Shared helper for admin Route Handlers. Verifies Bearer token and checks permission in one call.

```ts
const guard = await requirePermission(request, 'manageEvents');
if (guard.error) return guard.error; // returns the NextResponse directly
// guard.token, guard.role available
```

---

## Files

| File | Purpose |
|---|---|
| `src/server/permissions.ts` | Permission map and `can()` helper |
| `src/server/guard.ts` | Reusable auth + permission guard for Route Handlers |
| `src/lib/firebase-admin/auth.ts` | `syncUser`, `verifyIdToken` |
| `src/app/api/auth/session/route.ts` | Session endpoint called after every sign-in |
| `src/lib/firebase/session.ts` | `callSessionApi()` client helper |
| `src/lib/firebase/useAuth.ts` | `useAuth()` hook — `{ user, role, loading }` |
