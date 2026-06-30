/**
 * /leaderboard/contests — Upcoming Contests
 *
 * Shows upcoming programming contests from all platforms.
 * Data sourced from Kontests API via background sync.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { UpcomingContest } from '@/schema/leaderboard';
import { PLATFORMS, type Platform } from '@/config/leaderboard';
import styles from './page.module.css';

const PLATFORM_FILTERS = [
  { value: '', label: 'All Platforms' },
  { value: 'leetcode', label: 'LeetCode' },
  { value: 'codeforces', label: 'Codeforces' },
  { value: 'codechef', label: 'CodeChef' },
];

export default function ContestsPage() {
  const [allContests, setAllContests] = useState<UpcomingContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchContests();
  }, []);

  async function fetchContests() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/contests`);
      if (!res.ok) throw new Error('Failed to fetch contests');

      const json = await res.json();
      setAllContests(json.data ?? []);
    } catch {
      setAllContests([]);
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort contests
  const filteredContests = allContests.filter(c => !filter || c.platform === filter);
  const sortedContests = [...filteredContests].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>Upcoming Contests</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.filterSelect}
        >
          {PLATFORM_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : sortedContests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No upcoming contests found</p>
          <p className={styles.emptyHint}>Check back later — contests are refreshed every 3 hours</p>
        </div>
      ) : (
        <div className={styles.contestGrid}>
          {sortedContests.map((contest) => (
            <ContestCard key={contest.id} contest={contest} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Contest Card ───────────────────────────────────────────────────────────────

function ContestCard({ contest }: { contest: UpcomingContest }) {
  const start = new Date(contest.startTime);
  const now = new Date();
  const isActive = start <= now && new Date(contest.endTime) > now;
  const isPast = new Date(contest.endTime) <= now;

  const platformMeta = PLATFORMS[contest.platform as Platform];
  const color = platformMeta?.color ?? '#71717a';
  const displayPlatform = platformMeta?.displayName ?? contest.platform;

  const duration = formatDuration(contest.duration);

  return (
    <a
      href={contest.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.contestCard} ${isActive ? styles.active : ''} ${isPast ? styles.past : ''}`}
      style={{ '--platform-color': color } as React.CSSProperties}
    >
      <div className={styles.cardTop}>
        <div className={styles.platformOverline}>
          <span className={styles.platformDot} style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
          <span>{displayPlatform}</span>
        </div>
        {isActive && (
          <span className={styles.statusLive}>[ LIVE ]</span>
        )}
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.contestName}>{contest.name}</h3>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.readoutGroup}>
          <div className={styles.readoutBlock}>
            <span className={styles.readoutLabel}>START TIME</span>
            <span className={styles.readoutValue}>{formatDateFull(start)}</span>
          </div>
          <div className={styles.readoutDivider} />
          <div className={styles.readoutBlock}>
            <span className={styles.readoutLabel}>DURATION</span>
            <span className={styles.readoutValue}>{Math.floor(contest.duration / 60)}m</span>
          </div>
        </div>
        <div className={styles.actionArrow}>
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M5 12h14"></path>
            <path d="M12 5l7 7-7 7"></path>
          </svg>
        </div>
      </div>
    </a>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateFull(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = days[date.getDay()];
  const month = months[date.getMonth()];
  const d = date.getDate().toString().padStart(2, '0');
  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');

  return `${day} ${month} ${d} ${y} ${h}:${m}:${s}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}
