/**
 * /leaderboard — Overall ACM Leaderboard
 *
 * Shows all students ranked by ACM Score.
 * Includes search, filters, and weekly deltas.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LeaderboardTable, { type Column } from '@/components/leaderboard/LeaderboardTable';
import LeaderboardSearch from '@/components/leaderboard/LeaderboardSearch';
import LeaderboardFilters from '@/components/leaderboard/LeaderboardFilters';
import DeltaBadge from '@/components/leaderboard/DeltaBadge';
import PlatformBadge from '@/components/leaderboard/PlatformBadge';
import { LeetCodeIcon, CodeforcesIcon, CodeChefIcon, GitHubIcon } from '@/components/leaderboard/PlatformIcons';
import type { LeaderboardEntry } from '@/schema/leaderboard';
import styles from './page.module.css';

export default function OverallLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ branch: '', year: '', batch: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        platform: 'overall',
        page: String(page),
        limit: '25',
      });

      if (search) params.set('search', search);
      if (filters.branch) params.set('branch', filters.branch);
      if (filters.year) params.set('year', filters.year);
      if (filters.batch) params.set('batch', filters.batch);

      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard data');

      const json = await res.json();
      setEntries(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [search, filters, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search/filters change
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
  }, []);

  const columns: Column[] = [
    {
      key: 'branch',
      label: 'Branch',
      getValue: (e) => e.branch,
      align: 'left' as const,
    },
    {
      key: 'currentYear',
      label: 'Year',
      getValue: (e) => e.currentYear,
      getSortValue: (e) => e.currentYear,
      align: 'center' as const,
    },
    {
      key: 'acm.score',
      label: 'ACM Score',
      getValue: (e) => e.acm.score.toFixed(1),
      getSortValue: (e) => e.acm.score,
      render: (e) => (
        <span style={{ color: '#60a5fa', fontWeight: 600 }}>{e.acm.score.toFixed(1)}</span>
      ),
    },
    {
      key: 'leetcode',
      label: <LeetCodeIcon style={{ fontSize: '1.25rem' }} aria-label="LeetCode" />,
      getValue: () => 0,
      render: (e) => <PlatformBadge platform="leetcode" stats={e.leetcode} />,
      align: 'center',
      className: 'hideOnMobile', // Hide on mobile maybe? No, let's just keep them all for now or maybe hide on tablet.
    },
    {
      key: 'codeforces',
      label: <CodeforcesIcon style={{ fontSize: '1.25rem' }} aria-label="Codeforces" />,
      getValue: () => 0,
      render: (e) => <PlatformBadge platform="codeforces" stats={e.codeforces} />,
      align: 'center',
    },
    {
      key: 'codechef',
      label: <CodeChefIcon style={{ fontSize: '1.25rem' }} aria-label="CodeChef" />,
      getValue: () => 0,
      render: (e) => <PlatformBadge platform="codechef" stats={e.codechef} />,
      align: 'center',
    },
    {
      key: 'github',
      label: <GitHubIcon style={{ fontSize: '1.25rem' }} aria-label="GitHub" />,
      getValue: () => 0,
      render: (e) => <PlatformBadge platform="github" stats={e.github} />,
      align: 'center',
    },
  ];

  return (
    <div className={styles.page}>
      {/* Controls */}
      <div className={styles.controls}>
        <LeaderboardSearch onSearch={handleSearch} />
        <LeaderboardFilters
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={fetchData} className={styles.retryBtn}>Retry</button>
        </div>
      )}

      {/* Table */}
      <LeaderboardTable
        entries={entries}
        columns={columns}
        loading={loading}
        showRank
        emptyMessage="No students on the leaderboard yet"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
