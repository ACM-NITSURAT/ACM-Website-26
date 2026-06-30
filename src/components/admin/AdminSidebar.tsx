'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/lib/firebase';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Events',
    href: '/admin/events',
    matchPrefix: '/admin/events',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    label: 'Leaderboard',
    href: '/admin/leaderboard',
    matchPrefix: '/admin/leaderboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20v-8M6 20V16M18 20V8" />
      </svg>
    ),
  },
];

function NavLink({ item, expanded }: { item: NavItem; expanded: boolean }) {
  const pathname = usePathname();
  const isActive = item.matchPrefix
    ? pathname.startsWith(item.matchPrefix)
    : pathname === item.href;

  return (
    <Link
      href={item.href}
      title={!expanded ? item.label : undefined}
      className={`
        group relative flex items-center gap-3 px-3 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-150 font-mono border
        ${isActive
          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          : 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
        }
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-indigo-400 rounded-full" />
      )}

      <span className="flex-shrink-0 pl-1">{item.icon}</span>

      <span
        className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
          expanded ? 'w-28 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        {item.label}
      </span>

      {/* Tooltip when collapsed */}
      {!expanded && (
        <span className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
          {item.label}
        </span>
      )}
    </Link>
  );
}

export default function AdminSidebar() {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`
        relative flex flex-col
        border-r border-white/5
        bg-[#12121a]
        transition-all duration-200 ease-out
        ${expanded ? 'w-56' : 'w-[72px]'}
        flex-shrink-0 z-40
      `}
    >
      {/* Logo mark */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5 bg-black/20">
        <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-indigo-600 flex items-center justify-center border border-indigo-500/50">
          <span className="text-white text-xs font-black tracking-widest leading-none font-mono">AD</span>
        </div>
        <span
          className={`overflow-hidden whitespace-nowrap text-lg font-black text-white transition-all duration-200 ${
            expanded ? 'w-32 opacity-100' : 'w-0 opacity-0'
          }`}
          style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
        >
          Operations
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-2 px-3 pt-6 flex-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} expanded={expanded} />
        ))}
      </nav>

      {/* Bottom: logout */}
      <div className="px-3 pb-6 border-t border-white/5 pt-4 bg-black/10">
        <button
          onClick={handleLogout}
          title={!expanded ? 'Sign out' : undefined}
          className="group relative w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-transparent hover:border-red-500/20 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 font-mono"
        >
          <span className="flex-shrink-0 pl-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </span>
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
              expanded ? 'w-28 opacity-100' : 'w-0 opacity-0'
            }`}
          >
            Sign out
          </span>
          {!expanded && (
            <span className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded bg-black/80 backdrop-blur-md border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              Sign out
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
