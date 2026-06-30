'use client';

import PlatformLeaderboard from '@/components/leaderboard/PlatformLeaderboard';
import DeltaBadge from '@/components/leaderboard/DeltaBadge';
import type { Column } from '@/components/leaderboard/LeaderboardTable';

const columns: Column[] = [
  {
    key: 'leetcode.rating',
    label: 'Rating',
    getValue: (e) => e.leetcode?.rating ?? '—',
    getSortValue: (e) => e.leetcode?.rating ?? 0,
    render: (e) => (
      <span style={{ color: '#FFA116', fontWeight: 600 }}>
        {e.leetcode?.rating ?? '—'}
      </span>
    ),
  },
  {
    key: 'leetcode.totalSolved',
    label: 'Solved',
    getValue: (e) => e.leetcode?.totalSolved ?? '—',
    getSortValue: (e) => e.leetcode?.totalSolved ?? 0,
  },
  {
    key: 'leetcode.breakdown',
    label: 'E / M / H',
    getValue: () => '',
    render: (e) => {
      if (!e.leetcode) return '—';
      return (
        <span style={{ fontSize: '0.75rem' }}>
          <span style={{ color: '#22c55e' }}>{e.leetcode.easySolved}</span>
          {' / '}
          <span style={{ color: '#eab308' }}>{e.leetcode.mediumSolved}</span>
          {' / '}
          <span style={{ color: '#ef4444' }}>{e.leetcode.hardSolved}</span>
        </span>
      );
    },
  },
  {
    key: 'leetcode.contestCount',
    label: 'Contests',
    getValue: (e) => e.leetcode?.contestCount ?? '—',
    getSortValue: (e) => e.leetcode?.contestCount ?? 0,
  },
  {
    key: 'delta',
    label: 'Weekly',
    getValue: () => 0,
    render: (e) => (
      <DeltaBadge
        current={e.leetcode?.rating ?? null}
        previous={e.previousSnapshot?.lcRating ?? null}
      />
    ),
  },
];

export default function LeetCodePage() {
  return <PlatformLeaderboard platform="leetcode" columns={columns} />;
}
