import { FieldValue } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import adminDb from './firestore';
import type { User } from '@/schema/user';

// ── Role resolution ───────────────────────────────────────────────────────────

type Role = User['role'];

/**
 * Determines the correct role for a user based on the following priority:
 *
 *  1. If the user already has `role: 'core'` or `role: 'adviser'` in Firestore,
 *     keep it — these are set manually and must never be downgraded automatically.
 *  2. If the user's email appears in `/dict/executives`, assign `'executive'`.
 *  3. Otherwise assign `'member'`.
 *
 * Called internally by `syncUser` on every sign-in.
 */
async function resolveRole(email: string, existingRole?: Role): Promise<Role> {
  // Manual roles are never overwritten by automation.
  if (existingRole === 'core' || existingRole === 'adviser') {
    return existingRole;
  }

  const dictSnap = await adminDb.doc('dict/executives').get();

  if (dictSnap.exists) {
    const emails: string[] = dictSnap.data()?.emails ?? [];
    if (emails.includes(email.toLowerCase().trim())) {
      return 'executive';
    }
  }

  return 'member';
}

// ── User sync ─────────────────────────────────────────────────────────────────

/**
 * Creates or updates the `/users/{uid}` document after a successful sign-in.
 *
 * - On first sign-in: creates the document with `role: 'member'` (or
 *   `'executive'` if the email is in `/dict/executives`).
 * - On subsequent sign-ins: re-evaluates the role against the executives dict
 *   (so adding/removing an email takes effect on the next login) while
 *   preserving any manually assigned `'core'` or `'adviser'` role.
 *
 * Call this from a server-side Route Handler or Server Action immediately
 * after verifying the Firebase ID token.
 *
 * @param token - The decoded ID token returned by `adminAuth.verifyIdToken()`.
 * @returns The resolved role that was written to Firestore.
 */
export async function syncUser(token: DecodedIdToken): Promise<Role> {
  const { uid, email, name, picture } = token;

  if (!email) throw new Error(`Token for uid ${uid} has no email claim.`);

  const userRef = adminDb.doc(`users/${uid}`);
  const snap = await userRef.get();

  const existingRole: Role | undefined = snap.exists
    ? (snap.data() as Partial<User>).role
    : undefined;

  const role = await resolveRole(email, existingRole);

  if (!snap.exists) {
    // First sign-in — create the full user document.
    const [firstName = '', ...rest] = (name ?? '').split(' ');
    const lastName = rest.join(' ');

    const newUser: Omit<User, 'id'> = {
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      rollNumber: '',
      gender: 'other',
      profileImageUrl: picture ?? '',
      role,
      isSuperAdmin: false,
      registrationTimestamp: FieldValue.serverTimestamp() as never,
    };

    await userRef.set(newUser);
  } else {
    // Returning user — only update fields that may have changed automatically.
    await userRef.update({ role });
  }

  return role;
}

// ── Token verification helper ─────────────────────────────────────────────────

/**
 * Verifies a Firebase ID token string and returns the decoded payload.
 * Use this at the top of any protected Route Handler to authenticate the caller.
 *
 * @example
 * const token = await verifyIdToken(request.headers.get('Authorization')?.split('Bearer ')[1] ?? '');
 * const role  = await syncUser(token);
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  const { getAuth } = await import('firebase-admin/auth');
  const { default: adminApp } = await import('./app');
  return getAuth(adminApp).verifyIdToken(idToken);
}
