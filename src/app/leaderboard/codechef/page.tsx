'use client';

import PlatformLeaderboard from '@/components/leaderboard/PlatformLeaderboard';
import type { Column } from '@/components/leaderboard/LeaderboardTable';

const columns: Column[] = [
  {
    key: 'codechef.currentRating',
    label: 'Rating',
    getValue: (e) => e.codechef?.currentRating ?? '—',
    getSortValue: (e) => e.codechef?.currentRating ?? 0,
    render: (e) => (
      <span style={{ color: '#5B4638', fontWeight: 600 }}>
        {e.codechef?.currentRating ?? '—'}
      </span>
    ),
  },
  {
    key: 'codechef.stars',
    label: 'Stars',
    getValue: (e) => e.codechef?.stars ?? '—',
    getSortValue: (e) => e.codechef?.stars ?? 0,
    render: (e) => {
      if (!e.codechef) return '—';
      return <span style={{ color: '#eab308' }}>{'★'.repeat(e.codechef.stars)}</span>;
    },
  },
  {
    key: 'codechef.highestRating',
    label: 'Highest',
    getValue: (e) => e.codechef?.highestRating ?? '—',
    getSortValue: (e) => e.codechef?.highestRating ?? 0,
  },
  {
    key: 'codechef.contestCount',
    label: 'Contests',
    getValue: (e) => e.codechef?.contestCount ?? '—',
    getSortValue: (e) => e.codechef?.contestCount ?? 0,
  },
  {
    key: 'codechef.globalRank',
    label: 'Global Rank',
    getValue: (e) => e.codechef?.globalRank ?? '—',
    getSortValue: (e) => e.codechef?.globalRank ?? Infinity,
  },
];

export default function CodeChefPage() {
  return <PlatformLeaderboard platform="codechef" columns={columns} />;
}
