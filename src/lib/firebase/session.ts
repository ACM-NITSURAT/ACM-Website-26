'use client';

import { auth } from './auth';
import type { AppClaims, SyncUserResult } from '@/lib/firebase-admin/auth';

type Role = AppClaims['role'];

export interface SessionResult {
  role: Role | null;
  isOnboardingCompleted: boolean;
  /** True when the server rejected the email (403 — not an SVNIT address). */
  emailRejected: boolean;
}

/**
 * Calls POST /api/auth/session with the current user's ID token.
 *
 * Triggers server-side:
 *  - Email domain validation (when DEV_MODE=false).
 *  - Firestore user document creation (first sign-in) or role re-check.
 *  - Custom claim write (role → JWT).
 *
 * Force-refreshes the token after so useAuth() immediately reads the new role.
 */
export async function callSessionApi(): Promise<SessionResult> {
  const user = auth.currentUser;
  if (!user) return { role: null, isOnboardingCompleted: false, emailRejected: false };

  const idToken = await user.getIdToken();

  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (res.status === 403) {
    console.warn('[callSessionApi] email rejected by server (403)');
    return { role: null, isOnboardingCompleted: false, emailRejected: true };
  }

  if (!res.ok) {
    console.error('[callSessionApi] server returned', res.status);
    return { role: null, isOnboardingCompleted: false, emailRejected: false };
  }

  const data = await res.json() as SyncUserResult;

  // Force-refresh so useAuth picks up the updated role claim immediately.
  await user.getIdToken(/* forceRefresh */ true);

  return { role: data.role, isOnboardingCompleted: data.isOnboardingCompleted, emailRejected: false };
}
