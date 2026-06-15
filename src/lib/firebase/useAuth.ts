'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './auth';

interface AuthState {
  user: User | null;
  /** true while the initial auth check is in flight */
  loading: boolean;
}

/**
 * Subscribes to Firebase auth state changes.
 * `loading` is true until Firebase has resolved the persisted session —
 * use it to avoid a flash of the wrong UI on first render.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });
    return unsub;
  }, []);

  return state;
}
