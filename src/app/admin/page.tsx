'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase';
import FlashingGrid from '@/components/sections/FlashingGrid';

export default function AdminDashboard() {
  const { user, role } = useAuth();

  const cards = [
    {
      title: 'Events Manager',
      desc: 'View, edit, and delete existing events.',
      href: '/admin/events',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    },
    {
      title: 'Create Event',
      desc: 'Draft and publish a new event.',
      href: '/admin/create',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    },
    {
      title: 'Leaderboard Control',
      desc: 'Force sync data, recalculate scores, and manage coding profiles.',
      href: '/admin/leaderboard',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      )
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#07060a] overflow-hidden" data-flashing-container="true">
      <div className="absolute inset-0 z-0 pointer-events-none bg-grid-pattern">
        <FlashingGrid />
      </div>

      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 border-b border-indigo-500/20 pb-8">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
            Command <span className="text-indigo-400">Center</span>
          </h1>
          <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest flex items-center gap-2">
            Operator: <span className="text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{user?.displayName ?? user?.email ?? '—'}</span>
            <span className="text-zinc-600">|</span>
            Clearance: <span className="text-indigo-300 font-bold">{role}</span>
          </p>
        </div>

        {/* Quick-access cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative bg-[#12121a]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:-translate-y-1"
            >
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 ">
                  {card.icon}
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors duration-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              
              <div className="relative z-10">
                <h3 className="text-lg font-bold text-white mb-2 tracking-wide" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>{card.title}</h3>
                <p className="text-sm text-zinc-400 font-mono leading-relaxed">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
