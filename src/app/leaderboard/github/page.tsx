'use client';

import PlatformLeaderboard from '@/components/leaderboard/PlatformLeaderboard';
import type { Column } from '@/components/leaderboard/LeaderboardTable';

const columns: Column[] = [
  {
    key: 'github.totalCommits',
    label: 'Commits',
    getValue: (e) => e.github?.totalCommits ?? '—',
    getSortValue: (e) => e.github?.totalCommits ?? 0,
    render: (e) => (
      <span style={{ color: '#22c55e', fontWeight: 600 }}>
        {e.github?.totalCommits?.toLocaleString() ?? '—'}
      </span>
    ),
  },
  {
    key: 'github.starsReceived',
    label: 'Stars',
    getValue: (e) => e.github?.starsReceived ?? '—',
    getSortValue: (e) => e.github?.starsReceived ?? 0,
    render: (e) => (
      <span style={{ color: '#eab308' }}>
        {e.github?.starsReceived ? `★ ${e.github.starsReceived}` : '—'}
      </span>
    ),
  },
  {
    key: 'github.publicRepos',
    label: 'Repos',
    getValue: (e) => e.github?.publicRepos ?? '—',
    getSortValue: (e) => e.github?.publicRepos ?? 0,
  },
  {
    key: 'github.pullRequests',
    label: 'PRs',
    getValue: (e) => e.github?.pullRequests ?? '—',
    getSortValue: (e) => e.github?.pullRequests ?? 0,
  },
  {
    key: 'github.followers',
    label: 'Followers',
    getValue: (e) => e.github?.followers ?? '—',
    getSortValue: (e) => e.github?.followers ?? 0,
  },
];

export default function GitHubPage() {
  return <PlatformLeaderboard platform="github" columns={columns} />;
}
