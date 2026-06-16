'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './auth';
import type { AppClaims } from '@/lib/firebase-admin/auth';

type Role = AppClaims['role'];

interface AuthState {
  user: User | null;
  role: Role | null;
  /** true while the initial auth check is in flight */
  loading: boolean;
}

/**
 * Subscribes to Firebase auth state and exposes the role decoded from
 * the JWT custom claim — no extra Firestore read needed.
 *
 * role is null while loading or when signed out.
 * role is always sourced from the signed JWT; it cannot be spoofed client-side.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, role: null, loading: false });
        return;
      }

      // Decode the JWT to read the custom claim.
      // forceRefresh=false — we just want what the current token already has.
      const idTokenResult = await user.getIdTokenResult();
      const role = (idTokenResult.claims as Partial<AppClaims>).role ?? null;

      setState({ user, role, loading: false });
    });

    return unsub;
  }, []);

  return state;
}
