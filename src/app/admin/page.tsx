'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase';

export default function AdminDashboard() {
  const { user, role } = useAuth();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Welcome back,{' '}
          <span className="text-zinc-200">{user?.displayName ?? user?.email ?? '—'}</span>
          {' '}·{' '}
          <span className="uppercase text-zinc-500 text-xs tracking-wider">{role}</span>
        </p>
      </div>

      {/* Quick-access cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/admin/events"
          className="group flex flex-col gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all duration-150"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-md bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors duration-150">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover:text-zinc-400 transition-colors duration-150">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Events</p>
            <p className="text-xs text-zinc-500 mt-0.5">Create, manage, and view all events</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
