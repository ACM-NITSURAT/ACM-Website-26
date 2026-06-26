'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (role !== 'core' && role !== 'adviser') { router.replace('/'); }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-zinc-500 text-sm">Loading…</span>
      </div>
    );
  }

  if (!user || (role !== 'core' && role !== 'adviser')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-zinc-500 text-sm">Redirecting…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex pt-[74px]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
