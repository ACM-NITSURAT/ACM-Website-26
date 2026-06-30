'use client';

import PlatformLeaderboard from '@/components/leaderboard/PlatformLeaderboard';
import PlatformBadge from '@/components/leaderboard/PlatformBadge';
import { formatCompactNumber } from '@/lib/utils/formatters';
import type { Column } from '@/components/leaderboard/LeaderboardTable';

const columns: Column[] = [
  {
    key: 'codechef.stars',
    label: 'Stars',
    getValue: () => 0,
    render: (e) => <PlatformBadge platform="codechef" stats={e.codechef} />,
    align: 'left' as const,
  },
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
    key: 'codechef.highestRating',
    label: 'Highest Rating',
    getValue: (e) => e.codechef?.highestRating ?? '—',
    getSortValue: (e) => e.codechef?.highestRating ?? 0,
    className: 'hideOnTablet',
  },
  {
    key: 'codechef.globalRank',
    label: 'Global Rank',
    getValue: (e) => e.codechef?.globalRank ?? '—',
    getSortValue: (e) => e.codechef?.globalRank ?? 9999999,
    render: (e) => e.codechef?.globalRank ? formatCompactNumber(e.codechef.globalRank) : '—',
    className: 'hideOnMobile',
  },
  {
    key: 'codechef.contestCount',
    label: 'Contests',
    getValue: (e) => e.codechef?.contestCount ?? '—',
    getSortValue: (e) => e.codechef?.contestCount ?? 0,
  },
];

export default function CodeChefPage() {
  return <PlatformLeaderboard platform="codechef" columns={columns} />;
}
