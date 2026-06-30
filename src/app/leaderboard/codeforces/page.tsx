'use client';

import PlatformLeaderboard from '@/components/leaderboard/PlatformLeaderboard';
import DeltaBadge from '@/components/leaderboard/DeltaBadge';
import type { Column } from '@/components/leaderboard/LeaderboardTable';

const columns: Column[] = [
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
    key: 'codeforces.currentRank',
    label: 'Rank',
    getValue: (e) => e.codeforces?.currentRank ?? '—',
    align: 'left' as const,
    render: (e) => {
      const rank = e.codeforces?.currentRank ?? '—';
      const color = getCFRankColor(rank);
      return <span style={{ color, fontWeight: 500, fontSize: '0.75rem' }}>{rank}</span>;
    },
  },
  {
    key: 'codeforces.maxRating',
    label: 'Max',
    getValue: (e) => e.codeforces?.maxRating ?? '—',
    getSortValue: (e) => e.codeforces?.maxRating ?? 0,
  },
  {
    key: 'codeforces.problemsSolved',
    label: 'Solved',
    getValue: (e) => e.codeforces?.problemsSolved ?? '—',
    getSortValue: (e) => e.codeforces?.problemsSolved ?? 0,
  },
  {
    key: 'codeforces.contestCount',
    label: 'Contests',
    getValue: (e) => e.codeforces?.contestCount ?? '—',
    getSortValue: (e) => e.codeforces?.contestCount ?? 0,
  },
  {
    key: 'delta',
    label: 'Weekly',
    getValue: () => 0,
    render: (e) => (
      <DeltaBadge
        current={e.codeforces?.currentRating ?? null}
        previous={e.previousSnapshot?.cfRating ?? null}
      />
    ),
  },
];

function getCFRankColor(rank: string): string {
  const r = rank.toLowerCase();
  if (r.includes('legendary')) return '#ff0000';
  if (r.includes('international grandmaster')) return '#ff0000';
  if (r.includes('grandmaster')) return '#ff0000';
  if (r.includes('international master')) return '#ff8c00';
  if (r.includes('master')) return '#ff8c00';
  if (r.includes('candidate master')) return '#aa00aa';
  if (r.includes('expert')) return '#0000ff';
  if (r.includes('specialist')) return '#03a89e';
  if (r.includes('pupil')) return '#008000';
  return '#808080';
}

export default function CodeforcesPage() {
  return <PlatformLeaderboard platform="codeforces" columns={columns} />;
}
