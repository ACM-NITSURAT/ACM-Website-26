'use client';

import { auth } from './auth';
import type { AppClaims, SyncUserResult } from '@/lib/firebase-admin/auth';

type Role = AppClaims['role'];

export interface SessionResult {
  role: Role | null;
  isOnboardingCompleted: boolean;
}

/**
 * Calls POST /api/auth/session with the current user's ID token.
 *
 * Triggers server-side:
 *  - Firestore user document creation (first sign-in) or role re-check.
 *  - Custom claim write (role → JWT).
 *
 * Force-refreshes the token after so useAuth() immediately reads the new role.
 * Returns role and isOnboardingCompleted so the caller can redirect accordingly.
 */
export async function callSessionApi(): Promise<SessionResult> {
  const user = auth.currentUser;
  if (!user) return { role: null, isOnboardingCompleted: false };

  const idToken = await user.getIdToken();

  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    console.error('[callSessionApi] server returned', res.status);
    return { role: null, isOnboardingCompleted: false };
  }

  const data = await res.json() as SyncUserResult;

  // Force-refresh so useAuth picks up the updated role claim immediately.
  await user.getIdToken(/* forceRefresh */ true);

  return { role: data.role, isOnboardingCompleted: data.isOnboardingCompleted };
}
