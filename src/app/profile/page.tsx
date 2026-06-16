'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth, logout } from '@/lib/firebase';

export default function ProfilePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-zinc-500 text-sm">Loading…</span>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const initials = (user.displayName ?? user.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Avatar */}
        {user.photoURL ? (
          <Image
            src={user.photoURL}
            alt={user.displayName ?? 'Profile photo'}
            width={80}
            height={80}
            className="rounded-full ring-2 ring-zinc-700"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full bg-zinc-800 ring-2 ring-zinc-700 flex items-center justify-center text-white text-xl font-semibold"
            aria-label="Profile initials"
          >
            {initials}
          </div>
        )}

        {/* User info */}
        <div className="text-center">
          {user.displayName && (
            <p className="text-white text-lg font-semibold">{user.displayName}</p>
          )}
          <p className="text-zinc-400 text-sm mt-0.5">{user.email}</p>
          {role && (
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">{role}</p>
          )}
          {!user.emailVerified && (
            <p className="text-amber-400 text-xs mt-2">Email not verified</p>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-md py-2 text-sm text-white hover:bg-zinc-800 transition-colors"
        >
          Sign out
        </button>

      </div>
    </div>
  );
}
