# Authorization

ACM SVNIT — `acm-nit-surat` project.

---

## Role hierarchy

```
member  <  executive  <  core
```

Adviser is independent — no inherited hierarchy. Permissions are listed explicitly.
(NOTE: I have just put Advisor as an extra role later if we want any independent role we can assign it as advisor ya baad me change kar denge)

| Role | How assigned |
|---|---|
| `member` | Default for all new accounts |
| `executive` | Email in `/dict/executives` — re-checked on every sign-in |
| `core` | Manual only — set directly in Firestore |
| `adviser` | Manual only — set directly in Firestore |

`isSuperAdmin` is a separate boolean on the Firestore user document. It is **never** stored in JWT claims or client state. Always read server-side from Firestore for the operations that need it.

---

## Storage: Firebase Custom Claims

Role is stored as a **custom claim** inside the Firebase JWT:

```json
{ "role": "member" }
```

- The Admin SDK is the only thing that can write claims (`setCustomUserClaims`).
- Claims are cryptographically signed by Google. The client cannot forge them.
- The client reads the claim via `user.getIdTokenResult()` — no Firestore read needed.
- Every server-side Route Handler verifies the token with `verifyIdToken()` before trusting any claim.

---

## Sign-in / registration flow

```
Client                            Server
──────                            ──────
1. Firebase sign-in
   (email or Google)
        │
2. getIdToken()  ────────────────▶  POST /api/auth/session
                                        │
                                    3. verifyIdToken()
                                        │
                                    4. syncUser()
                                       ├─ First sign-in:
                                       │   create /users/{uid} (schema defaults)
                                       ├─ Every sign-in:
                                       │   re-check /dict/executives
                                       │   update Firestore role
                                       └─ setCustomUserClaims({ role })
                                        │
        ◀────────────────────────── { role }
        │
5. getIdToken(true)  ← force-refresh
   JWT now contains updated role
        │
6. useAuth() reads role
   from decoded token
```

---

## Role re-evaluation on every sign-in

`syncUser` always runs the role check regardless of whether the user is new or returning. This means:

- Adding an email to `/dict/executives` → takes effect on the user's **next sign-in**.
- Removing an email → takes effect on the user's **next sign-in**.
- `core` and `adviser` roles are never touched by automation — only manual Firestore edits change them.

**Demotion window:** The current JWT lives for up to 1 hour. A demoted user retains their old role claim until the token expires or they sign out and back in. This is an accepted trade-off — for a student chapter website the 1-hour window is acceptable.

---

## Files

| File | Purpose |
|---|---|
| `src/server/permissions.ts` | Server-only permissions index — maps roles to capabilities |
| `src/lib/firebase-admin/auth.ts` | `syncUser`, `verifyIdToken` — Admin SDK auth logic |
| `src/app/api/auth/session/route.ts` | Route Handler called by client after every sign-in |
| `src/lib/firebase/session.ts` | `callSessionApi()` — client helper that hits the session endpoint and force-refreshes the token |
| `src/lib/firebase/useAuth.ts` | `useAuth()` — exposes `{ user, role, loading }` decoded from the JWT |

---

## Permissions index (`src/server/permissions.ts`)

Import `can` in any Route Handler or Server Action to gate an operation:

```ts
import { can } from '@/server/permissions';

// Inside a Route Handler:
const token = await verifyIdToken(idToken);
const role  = token.role as Role;

if (!can(role, 'manageEvents')) {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
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

Adviser has no inherited hierarchy from core — permissions are assigned explicitly.
Add new permissions by extending the `PERMISSIONS` object in `src/server/permissions.ts`.

---

## Using `useAuth` in client components

```ts
import { useAuth } from '@/lib/firebase';

export default function SomePage() {
  const { user, role, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user)   return <Redirect to="/login" />;

  return (
    <div>
      <p>Signed in as {user.email} ({role})</p>
      {role === 'executive' || role === 'core' || role === 'adviser' ? (
        <AdminPanel />
      ) : null}
    </div>
  );
}
```

The role in `useAuth` is **cosmetic** — it controls what UI is shown. The real enforcement happens on the server via `can()`. Never skip the server-side check.
