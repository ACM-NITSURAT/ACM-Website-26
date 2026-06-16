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

## Email validation

**Files:**
- `src/lib/validators/email.ts` — Email domain validation logic
- `src/config/index.ts` — `EARLY_REJECT` flag
- `src/components/auth/InvalidEmailModal.tsx` — Rejection acknowledgement modal
- `src/components/auth/LoggedOutModal.tsx` — Logout notification modal (EARLY_REJECT=false)

When `DEV_MODE=false`, only `@svnit.ac.in` emails are accepted. Emails are validated server-side in the session API.

### Rejection modes

#### EARLY_REJECT = true (default)

The user is **immediately logged out** when signing in with an unauthorized email, then shown an acknowledgement modal.

**Flow:**
1. User signs in with non-SVNIT email
2. Session API validates email → returns 403
3. Client detects `emailRejected: true`
4. **Logout immediately** (invalid session priority)
5. Redirect to auth page with `?rejected=1` query param
6. `InvalidEmailModal` shown on mount (reads `?rejected=1`)
7. Modal dismiss clears query param

**Why logout first?** The session is invalid — logging out is the top priority. The modal is just for user acknowledgement.

**Why URL param?** Clean state management without module-level flags. The flow is debuggable by inspecting the URL.

#### EARLY_REJECT = false

The user reaches the onboarding page but sees a friendly error when they try to submit the form. **Additionally, if the user tries to navigate to any other page (e.g., `/profile`, `/events`), they are automatically logged out and redirected to the login page with a modal explaining they were logged out due to incomplete registration.**

**Flow:**
1. User signs in with non-SVNIT email
2. Session API validates email → returns 403 and sets `email_rejected` cookie
3. Client redirects to `/onboarding`
4. User fills onboarding form
5. Form submission fails with friendly message: "Please register with a valid institute email (ending with @svnit.ac.in)"

**OR if user tries to access other pages:**
1. Middleware detects `email_rejected` cookie
2. User redirected to `/login?logged_out=incomplete_registration`
3. Auth cookies cleared (logout enforced)
4. `LoggedOutModal` shown explaining they were logged out
5. Modal dismiss clears query param

### Implementation notes

- Email validation happens server-side in `/api/auth/session` (cannot be bypassed)
- Validation uses `isValidSvnitEmail()` from `src/lib/validators/email.ts`
- Regex: `^[a-zA-Z0-9._%+-]+@svnit\.ac\.in$`
- Client-side hint shown on register page when `DEV_MODE=false`
- In `DEV_MODE=true`, all emails are accepted (for local development)
- When `EARLY_REJECT=false`, middleware enforces logout if rejected users try to access non-onboarding pages

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
