/**
 * Leaderboard shared layout.
 *
 * Provides:
 *  - Tab navigation (Overall, LeetCode, Codeforces, CodeChef, GitHub, Contests)
 *  - "Link Your Profiles" CTA for authenticated users
 *  - Consistent padding and background
 */

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase';
import styles from './layout.module.css';

const TABS = [
  { label: 'Overall',    href: '/leaderboard',            platform: null },
  { label: 'LeetCode',   href: '/leaderboard/leetcode',   platform: 'leetcode' },
  { label: 'Codeforces',  href: '/leaderboard/codeforces', platform: 'codeforces' },
  { label: 'CodeChef',   href: '/leaderboard/codechef',   platform: 'codechef' },
  { label: 'GitHub',     href: '/leaderboard/github',     platform: 'github' },
  { label: 'Contests',   href: '/leaderboard/contests',   platform: null },
] as const;

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Determine active tab
  const activeTab = TABS.find((tab) => {
    if (tab.href === '/leaderboard') return pathname === '/leaderboard';
    return pathname.startsWith(tab.href);
  });

  // Don't show tabs on student profile, compare, or link-profiles pages
  const isSubPage = pathname.includes('/student/') ||
                    pathname.includes('/compare') ||
                    pathname.includes('/link-profiles');

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>
              <span className={styles.titleAccent}>ACM</span> Leaderboard
            </h1>
            <p className={styles.subtitle}>
              Coding profiles & rankings for SVNIT students
            </p>
          </div>

          {user && (
            <Link href="/leaderboard/link-profiles" className={styles.linkProfilesCta}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Link Profiles
            </Link>
          )}
        </div>

        {/* Tab navigation */}
        {!isSubPage && (
          <nav className={styles.tabs} aria-label="Leaderboard navigation">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${styles.tab} ${activeTab?.href === tab.href ? styles.tabActive : ''}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Page content */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
