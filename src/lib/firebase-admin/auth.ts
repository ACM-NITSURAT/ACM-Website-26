import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import adminDb from './firestore';
import adminApp from './app';
import type { User } from '@/schema/user';
import { parseRollNumber, generateSlug } from '@/lib/validators/roll-number-parser';

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = User['role'];

/** Shape of the custom claims we write into the Firebase JWT. */
export interface AppClaims {
  role: Role;
}

export interface SyncUserResult {
  role: Role;
  isOnboardingCompleted: boolean;
}

// ── Role resolution ───────────────────────────────────────────────────────────

/**
 * Determines the correct role for a user:
 *  1. Existing 'core' or 'adviser' in Firestore → keep it (manual-only roles).
 *  2. Email in /dict/executives → 'executive'.
 *  3. Everyone else → 'member'.
 */
async function resolveRole(email: string, existingRole?: Role): Promise<Role> {
  if (existingRole === 'core' || existingRole === 'adviser') {
    return existingRole;
  }

  const dictQuery = await adminDb
    .collection('dict')
    .where('emails', 'array-contains', email.toLowerCase().trim())
    .limit(1)
    .get();

  if (!dictQuery.empty) {
    return 'executive';
  }

  return 'member';
}

// ── User sync + claim write ───────────────────────────────────────────────────

/**
 * Called server-side after every sign-in / registration.
 *
 * On first sign-in:
 *  - Creates /users/{uid} with all schema defaults.
 *  - Resolves role from /dict/executives or defaults to 'member'.
 *  - Writes role as a Firebase Custom Claim on the JWT.
 *  - Parses branch and graduation year from the email.
 *  - Generates a URL-friendly leaderboard slug.
 *
 * On subsequent sign-ins:
 *  - Re-evaluates role (catches promotions/demotions in the dict).
 *  - Updates /users/{uid}.role and the JWT claim.
 *  - Role change takes effect on the client's next token refresh (≤1 hour).
 *
 * isSuperAdmin is NEVER written to claims — always read server-side from Firestore.
 *
 * @returns SyncUserResult — resolved role and onboarding status.
 */
export async function syncUser(token: DecodedIdToken): Promise<SyncUserResult> {
  const { uid, email, name, picture } = token;

  if (!email) throw new Error(`Token for uid ${uid} has no email claim.`);

  const userRef = adminDb.doc(`users/${uid}`);
  const snap = await userRef.get();

  const existingRole: Role | undefined = snap.exists
    ? (snap.data() as Partial<User>).role
    : undefined;

  const role = await resolveRole(email, existingRole);

  if (!snap.exists) {
    // First sign-in — create full user document per schema.
    const [firstName = '', ...rest] = (name ?? '').split(' ');
    const lastName = rest.join(' ');

    // Parse institutional data from the email
    const parsed = parseRollNumber(email);
    const rollNumber = email.split('@')[0].toLowerCase();
    const slug = generateSlug(firstName, lastName, rollNumber);

    const newUser: Omit<User, 'id'> = {
      firstName,
      lastName,
      email:                email.toLowerCase().trim(),
      rollNumber,
      gender:               'other',
      profileImageUrl:      picture ?? '',
      role,
      position:             null,
      isOnboardingCompleted: false,
      isSuperAdmin:         false,
      // Leaderboard fields — derived from email
      branch:               parsed?.branchCode ?? null,
      graduationBatch:      parsed?.graduationYear ?? null,
      leaderboardSlug:      slug,
      // Platform usernames — not linked yet
      leetcodeUsername:      null,
      codeforcesHandle:     null,
      codechefUsername:      null,
      githubUsername:        null,
      registrationTimestamp: FieldValue.serverTimestamp() as never,
    };

    await userRef.set(newUser);
  } else {
    // Returning user — re-check role only.
    await userRef.update({ role });
  }

  // Write role into the JWT custom claims.
  // The client must call getIdToken(true) to force-refresh and receive the update.
  const claims: AppClaims = { role };
  await getAuth(adminApp).setCustomUserClaims(uid, claims);

  const isOnboardingCompleted = snap.exists
    ? ((snap.data() as Partial<User>).isOnboardingCompleted ?? false)
    : false;

  return { role, isOnboardingCompleted };
}

// ── Token verification ────────────────────────────────────────────────────────

/**
 * Verifies a raw Firebase ID token and returns the decoded payload.
 * Use at the top of every protected Route Handler.
 *
 * @example
 * const token = await verifyIdToken(
 *   request.headers.get('Authorization')?.split('Bearer ')[1] ?? ''
 * );
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  return getAuth(adminApp).verifyIdToken(idToken);
}
