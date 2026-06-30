'use client';

import PlatformLeaderboard from '@/components/leaderboard/PlatformLeaderboard';
import PlatformBadge from '@/components/leaderboard/PlatformBadge';
import { formatCompactNumber } from '@/lib/utils/formatters';
import type { Column } from '@/components/leaderboard/LeaderboardTable';

const columns: Column[] = [
  {
    key: 'codeforces.badge',
    label: 'Rank',
    getValue: () => 0,
    render: (e) => <PlatformBadge platform="codeforces" stats={e.codeforces} />,
    align: 'left' as const,
  },
  {
    key: 'codeforces.currentRating',
    label: 'Rating',
    getValue: (e) => e.codeforces?.currentRating ?? '—',
    getSortValue: (e) => e.codeforces?.currentRating ?? 0,
    render: (e) => (
      <span style={{ color: '#1890FF', fontWeight: 600 }}>
        {e.codeforces?.currentRating ?? '—'}
      </span>
    ),
  },
  {
    key: 'codeforces.maxRating',
    label: 'Max Rating',
    getValue: (e) => e.codeforces?.maxRating ?? '—',
    getSortValue: (e) => e.codeforces?.maxRating ?? 0,
    className: 'hideOnTablet',
  },
  {
    key: 'codeforces.maxRank',
    label: 'Max Rank',
    getValue: (e) => e.codeforces?.maxRank ?? '—',
    align: 'center' as const,
    className: 'hideOnMobile',
  },
  {
    key: 'codeforces.contestCount',
    label: 'Contests',
    getValue: (e) => e.codeforces?.contestCount ?? '—',
    getSortValue: (e) => e.codeforces?.contestCount ?? 0,
  },
  {
    key: 'codeforces.problemsSolved',
    label: 'Solved',
    getValue: (e) => e.codeforces?.problemsSolved ?? '—',
    getSortValue: (e) => e.codeforces?.problemsSolved ?? 0,
    render: (e) => e.codeforces?.problemsSolved ? formatCompactNumber(e.codeforces.problemsSolved) : '—',
  },
];


export default function CodeforcesPage() {
  return <PlatformLeaderboard platform="codeforces" columns={columns} />;
}
