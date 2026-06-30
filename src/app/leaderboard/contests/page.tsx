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
  { value: 'hackerrank', label: 'HackerRank' },
  { value: 'hackerearth', label: 'HackerEarth' },
  { value: 'atcoder', label: 'AtCoder' },
];

export default function ContestsPage() {
  const [contests, setContests] = useState<UpcomingContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchContests();
  }, [filter]);

  async function fetchContests() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('platform', filter);

      const res = await fetch(`/api/leaderboard/contests?${params}`);
      if (!res.ok) throw new Error('Failed to fetch contests');

      const json = await res.json();
      setContests(json.data ?? []);
    } catch {
      setContests([]);
    } finally {
      setLoading(false);
    }
  }

  // Group contests by date
  const grouped = groupByDate(contests);

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
      ) : contests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No upcoming contests found</p>
          <p className={styles.emptyHint}>Check back later — contests are refreshed every 3 hours</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {Object.entries(grouped).map(([date, dayContests]) => (
            <div key={date} className={styles.dateGroup}>
              <div className={styles.dateLabel}>{formatDateLabel(date)}</div>
              <div className={styles.contestGrid}>
                {dayContests.map((contest) => (
                  <ContestCard key={contest.id} contest={contest} />
                ))}
              </div>
            </div>
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
      <div className={styles.cardPlatform}>
        <span className={styles.platformDot} style={{ background: color }} />
        <span>{displayPlatform}</span>
      </div>
      <h3 className={styles.contestName}>{contest.name}</h3>
      <div className={styles.contestMeta}>
        <span>{formatTime(start)}</span>
        <span className={styles.metaDot}>·</span>
        <span>{duration}</span>
        {isActive && <span className={styles.liveBadge}>LIVE</span>}
      </div>
    </a>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByDate(contests: UpcomingContest[]): Record<string, UpcomingContest[]> {
  const groups: Record<string, UpcomingContest[]> = {};
  for (const contest of contests) {
    const date = new Date(contest.startTime).toISOString().split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(contest);
  }
  return groups;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
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
