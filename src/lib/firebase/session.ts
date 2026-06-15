'use client';

import { auth } from './auth';
import type { AppClaims } from '@/lib/firebase-admin/auth';

type Role = AppClaims['role'];

/**
 * Calls POST /api/auth/session with the current user's ID token.
 *
 * This triggers server-side:
 *  - Firestore user document creation (first sign-in) or role re-check.
 *  - Custom claim write (role → JWT).
 *
 * After this resolves, we force-refresh the token so the client's next
 * getIdTokenResult() call returns a JWT that already contains the role.
 *
 * Call this immediately after every sign-in or registration.
 *
 * @returns The role resolved by the server.
 */
export async function callSessionApi(): Promise<Role | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const idToken = await user.getIdToken();

  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    console.error('[callSessionApi] server returned', res.status);
    return null;
  }

  const { role } = await res.json() as { role: Role };

  // Force-refresh the JWT so the new claim is immediately available
  // in the client's next getIdTokenResult() call (used by useAuth).
  await user.getIdToken(/* forceRefresh */ true);

  return role;
}
