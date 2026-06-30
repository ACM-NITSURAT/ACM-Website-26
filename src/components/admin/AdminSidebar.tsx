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
        group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150
        ${isActive
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
        }
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-full" />
      )}

      <span className="flex-shrink-0 pl-0.5">{item.icon}</span>

      <span
        className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
          expanded ? 'w-28 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        {item.label}
      </span>

      {/* Tooltip when collapsed */}
      {!expanded && (
        <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
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
        border-r border-zinc-800
        bg-zinc-950
        transition-all duration-200 ease-out
        ${expanded ? 'w-52' : 'w-14'}
        flex-shrink-0 z-40
      `}
    >
      {/* Logo mark */}
      <div className="flex items-center gap-3 px-3 py-5 border-b border-zinc-800">
        <div className="w-8 h-8 flex-shrink-0 rounded-md bg-white flex items-center justify-center">
          <span className="text-zinc-900 text-xs font-bold leading-none">A</span>
        </div>
        <span
          className={`overflow-hidden whitespace-nowrap text-sm font-semibold text-white transition-all duration-200 ${
            expanded ? 'w-28 opacity-100' : 'w-0 opacity-0'
          }`}
        >
          Admin Panel
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2 pt-4 flex-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} expanded={expanded} />
        ))}
      </nav>

      {/* Bottom: logout */}
      <div className="px-2 pb-4 border-t border-zinc-800 pt-3">
        <button
          onClick={handleLogout}
          title={!expanded ? 'Sign out' : undefined}
          className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-zinc-500 hover:bg-zinc-800/60 hover:text-red-400 transition-all duration-150"
        >
          <span className="flex-shrink-0 pl-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
            <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              Sign out
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
