/**
 * Reusable platform-specific leaderboard page component.
 *
 * Each platform page (LeetCode, Codeforces, CodeChef, GitHub) wraps this
 * component with its own column definitions.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LeaderboardTable, { type Column } from '@/components/leaderboard/LeaderboardTable';
import LeaderboardSearch from '@/components/leaderboard/LeaderboardSearch';
import LeaderboardFilters from '@/components/leaderboard/LeaderboardFilters';
import type { LeaderboardEntry } from '@/schema/leaderboard';
import type { Platform } from '@/config/leaderboard';
import styles from './PlatformLeaderboard.module.css';

interface PlatformLeaderboardProps {
  platform: Platform;
  columns: Column[];
}

export default function PlatformLeaderboard({
  platform,
  columns,
}: PlatformLeaderboardProps) {
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
      const params = new URLSearchParams({ platform, page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (filters.branch) params.set('branch', filters.branch);
      if (filters.year) params.set('year', filters.year);
      if (filters.batch) params.set('batch', filters.batch);

      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const json = await res.json();
      setEntries(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [platform, search, filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, filters]);

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <LeaderboardSearch onSearch={handleSearch} />
        <LeaderboardFilters filters={filters} onFilterChange={setFilters} />
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={fetchData} className={styles.retryBtn}>Retry</button>
        </div>
      )}

      <LeaderboardTable
        entries={entries}
        columns={columns}
        loading={loading}
        showRank
        platform={platform}
        emptyMessage={`No students have linked their ${platform} profiles yet`}
      />

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Previous
          </button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
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
