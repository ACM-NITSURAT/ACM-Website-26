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
    if (!loading && user) {
      router.replace('/profile');
    }
  }, [user, loading, router]);

  // Don't flash the auth form while Firebase resolves the session
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-zinc-500 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
      {children}
    </div>
  );
}
