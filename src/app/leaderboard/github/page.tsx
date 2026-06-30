'use client';

import PlatformLeaderboard from '@/components/leaderboard/PlatformLeaderboard';
import type { Column } from '@/components/leaderboard/LeaderboardTable';
import { formatCompactNumber } from '@/lib/utils/formatters';

const columns: Column[] = [
  {
    key: 'github.publicRepos',
    label: 'Repositories',
    getValue: (e) => e.github?.publicRepos ?? '—',
    getSortValue: (e) => e.github?.publicRepos ?? 0,
    render: (e) => e.github?.publicRepos ? formatCompactNumber(e.github.publicRepos) : '—',
  },
  {
    key: 'github.totalCommits',
    label: 'Commits',
    getValue: (e) => e.github?.totalCommits ?? '—',
    getSortValue: (e) => e.github?.totalCommits ?? 0,
    render: (e) => (
      <span style={{ color: '#22c55e', fontWeight: 600 }}>
        {e.github?.totalCommits ? formatCompactNumber(e.github.totalCommits) : '—'}
      </span>
    ),
  },
  {
    key: 'github.starsReceived',
    label: 'Stars',
    getValue: (e) => e.github?.starsReceived ?? '—',
    getSortValue: (e) => e.github?.starsReceived ?? 0,
    className: 'hideOnMobile',
    render: (e) => (
      <span style={{ color: '#eab308' }}>
        {e.github?.starsReceived ? `★ ${formatCompactNumber(e.github.starsReceived)}` : '—'}
      </span>
    ),
  },
  {
    key: 'github.pullRequests',
    label: 'PRs',
    getValue: (e) => e.github?.pullRequests ?? '—',
    getSortValue: (e) => e.github?.pullRequests ?? 0,
    className: 'hideOnTablet',
    render: (e) => e.github?.pullRequests ? formatCompactNumber(e.github.pullRequests) : '—',
  },
  {
    key: 'github.followers',
    label: 'Followers',
    getValue: (e) => e.github?.followers ?? '—',
    getSortValue: (e) => e.github?.followers ?? 0,
    className: 'hideOnTablet',
    render: (e) => e.github?.followers ? formatCompactNumber(e.github.followers) : '—',
  },
];

export default function GitHubPage() {
  return <PlatformLeaderboard platform="github" columns={columns} />;
}
