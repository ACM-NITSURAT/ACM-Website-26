'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect signed-in users to onboarding (or they'll go to profile if complete)
    if (loading || !user) return;
    router.replace('/onboarding');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-zinc-500 text-sm">Loading…</span>
      </div>
    );
  }

  // Signed in → show loading while redirect is in-flight
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-zinc-500 text-sm">Loading…</span>
      </div>
    );
  }

  // Not signed in → render auth pages
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
      {children}
    </div>
  );
}
