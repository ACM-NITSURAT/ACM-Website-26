# Authentication

ACM SVNIT — `acm-nit-surat` project.

**File:** `src/lib/firebase/auth.ts`
**Import:** `import { ... } from '@/lib/firebase'`

All auth helpers are thin wrappers around the Firebase client SDK. They handle repetitive boilerplate so call-sites stay clean.

---

## `auth`

The singleton `Auth` instance. Use it anywhere you need to read `auth.currentUser` or subscribe to auth state:

```ts
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

onAuthStateChanged(auth, (user) => {
  // user is null when signed out
});
```

---

## Helper functions

| Function | Signature | Firebase call | Notes |
|---|---|---|---|
| `signInWithGoogle` | `() => Promise<UserCredential>` | `signInWithPopup` | Opens Google OAuth popup. Handles both new and returning users |
| `registerWithEmail` | `(email, password) => Promise<UserCredential>` | `createUserWithEmailAndPassword` + `sendEmailVerification` | Creates account **and** sends verification email in one call |
| `loginWithEmail` | `(email, password) => Promise<UserCredential>` | `signInWithEmailAndPassword` | |
| `sendVerificationEmail` | `(user: User) => Promise<void>` | `sendEmailVerification` | Re-send verification email if the original expired |
| `sendPasswordReset` | `(email) => Promise<void>` | `sendPasswordResetEmail` | Resolves silently even if email is not registered (Firebase avoids leaking account existence) |
| `logout` | `() => Promise<void>` | `signOut` | Clears local auth state |

---

## Usage examples

```ts
import {
  signInWithGoogle,
  registerWithEmail,
  loginWithEmail,
  sendVerificationEmail,
  sendPasswordReset,
  logout,
  auth,
} from '@/lib/firebase';

// Google sign-in
const { user } = await signInWithGoogle();

// Register + auto-send verification email
const { user } = await registerWithEmail('user@example.com', 'password123');

// Login
const { user } = await loginWithEmail('user@example.com', 'password123');

// Re-send verification email (e.g. user clicks "resend" button)
if (auth.currentUser) {
  await sendVerificationEmail(auth.currentUser);
}

// Forgot password
await sendPasswordReset('user@example.com');

// Logout
await logout();
```

---

## Error handling

All helpers throw `FirebaseError` on failure. Wrap in try/catch and inspect `error.code`:

```ts
import { FirebaseError } from 'firebase/app';

try {
  await loginWithEmail(email, password);
} catch (error) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
        // wrong email or password
        break;
      case 'auth/email-already-in-use':
        // registration with existing email
        break;
      case 'auth/too-many-requests':
        // account temporarily locked
        break;
    }
  }
}
```

Common error codes:

| Code | Trigger |
|---|---|
| `auth/invalid-credential` | Wrong email or password |
| `auth/email-already-in-use` | Registering with an existing email |
| `auth/weak-password` | Password shorter than 6 characters |
| `auth/user-not-found` | No account for this email (legacy projects) |
| `auth/too-many-requests` | Account temporarily locked after repeated failures |
| `auth/popup-closed-by-user` | User dismissed the Google popup |


---

## Server-side authorization

**File:** `src/lib/firebase-admin/auth.ts`
**Import:** `import { syncUser, verifyIdToken } from '@/lib/firebase-admin'`

This layer runs on the server only (Route Handlers, Server Actions). It verifies the Firebase ID token the client sends after sign-in and writes/updates the user document in Firestore.

---

### Role assignment rules

| Condition | Assigned role |
|---|---|
| Existing role is `'core'` or `'adviser'` | Kept — never overwritten by automation |
| Email is in `/dict/executives` | `'executive'` |
| Neither | `'member'` (default for all new accounts) |

`'core'` and `'adviser'` must be set manually in Firestore. Role is re-evaluated on every sign-in so the dict stays the source of truth for executives.

---

### `verifyIdToken(idToken)`

Verifies the raw Firebase ID token string sent by the client and returns the decoded payload.

```ts
import { verifyIdToken } from '@/lib/firebase-admin';

// Inside a Route Handler (app/api/auth/session/route.ts)
export async function POST(request: Request) {
  const { idToken } = await request.json();
  const token = await verifyIdToken(idToken);
  // token.uid, token.email, token.name, token.picture ...
}
```

---

### `syncUser(token)`

Creates or updates `/users/{uid}` after a verified sign-in. Returns the resolved role.

- **First sign-in:** creates the full user document with defaults (`rollNumber: ''`, `gender: 'other'`, `isSuperAdmin: false`). Name and picture are seeded from the token if present (useful for Google OAuth).
- **Returning user:** re-evaluates role against the executives dict, updates only the `role` field.

```ts
import { verifyIdToken, syncUser } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  const { idToken } = await request.json();

  const token = await verifyIdToken(idToken);
  const role  = await syncUser(token);

  // role is 'member' | 'executive' | 'core' | 'adviser'
  return Response.json({ role });
}
```

---

### Typical sign-in flow

```
Client                          Server (Route Handler)
──────                          ──────────────────────
1. signInWithGoogle()
   or loginWithEmail()
        │
2. auth.currentUser
   .getIdToken()  ─────────────▶  POST /api/auth/session
                                      │
                                  3. verifyIdToken(idToken)
                                      │
                                  4. syncUser(token)
                                     ├─ reads /dict/executives
                                     ├─ resolves role
                                     └─ writes /users/{uid}
                                      │
        ◀─────────────────────────  { role }
        │
5. Store role in client
   state / cookie
```

The client never decides its own role. The server reads the Firestore dict and writes the authoritative value.
