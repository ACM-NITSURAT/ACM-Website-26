/**
 * GitHub platform adapter.
 *
 * Uses GitHub's GraphQL API (requires Personal Access Token for reasonable limits).
 * Without PAT: 60 req/hour. With PAT: 5,000 req/hour.
 *
 * Single GraphQL query fetches:
 *  - Public repositories count
 *  - Total commit contributions (last year)
 *  - Followers count
 *  - Stars received across all repos
 *  - Pull requests opened
 *  - Issues opened
 */

import type { PlatformAdapter, ValidationResult, FetchStatsResult } from './types';
import type { GitHubStats } from '@/schema/leaderboard';
import { postJsonWithRetry, fetchJsonWithRetry, clamp0to100, safeDivide } from '../utils';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const GITHUB_REST = 'https://api.github.com';

function getGitHubToken(): string | undefined {
  return process.env.GITHUB_ACCESS_TOKEN;
}

function getAuthHeaders(): Record<string, string> {
  const token = getGitHubToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ── GraphQL Query ─────────────────────────────────────────────────────────────

const USER_STATS_QUERY = `
  query($username: String!) {
    user(login: $username) {
      login
      name
      followers {
        totalCount
      }
      repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100, orderBy: {field: STARGAZERS, direction: DESC}) {
        totalCount
        nodes {
          stargazerCount
        }
      }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        restrictedContributionsCount
      }
    }
  }
`;

// ── Response Types ────────────────────────────────────────────────────────────

interface GHGraphQLResponse {
  data?: {
    user: {
      login: string;
      name: string | null;
      followers: { totalCount: number };
      repositories: {
        totalCount: number;
        nodes: Array<{ stargazerCount: number }>;
      };
      contributionsCollection: {
        totalCommitContributions: number;
        totalPullRequestContributions: number;
        totalIssueContributions: number;
        restrictedContributionsCount: number;
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
}

interface GHRestUserResponse {
  login: string;
  name: string | null;
  public_repos: number;
  followers: number;
}

// ── Adapter Implementation ────────────────────────────────────────────────────

export class GitHubAdapter implements PlatformAdapter<GitHubStats> {
  readonly platform = 'github' as const;

  async validateUsername(username: string): Promise<ValidationResult> {
    const token = getGitHubToken();

    // If we have a token, use GraphQL for richer data
    if (token) {
      return this.validateWithGraphQL(username, token);
    }

    // Fallback to REST API (lower rate limit but sufficient for validation)
    return this.validateWithREST(username);
  }

  private async validateWithGraphQL(username: string, token: string): Promise<ValidationResult> {
    try {
      const { data } = await postJsonWithRetry<GHGraphQLResponse>(
        GITHUB_GRAPHQL,
        { query: USER_STATS_QUERY, variables: { username } },
        { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 8000 },
      );

      const user = data.data?.user;
      if (!user) {
        return { valid: false, error: 'Username not found on GitHub' };
      }

      const totalStars = user.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);
      const totalCommits = user.contributionsCollection.totalCommitContributions +
        user.contributionsCollection.restrictedContributionsCount;

      return {
        valid: true,
        preview: {
          displayName: user.name || user.login,
          extra: `${user.repositories.totalCount} repos · ${totalCommits} commits · ★ ${totalStars}`,
        },
      };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Failed to validate GitHub username',
      };
    }
  }

  private async validateWithREST(username: string): Promise<ValidationResult> {
    try {
      const { data, status } = await fetchJsonWithRetry<GHRestUserResponse>(
        `${GITHUB_REST}/users/${encodeURIComponent(username)}`,
        { timeoutMs: 8000, headers: { Accept: 'application/vnd.github.v3+json' } },
      );

      if (status === 404) {
        return { valid: false, error: 'Username not found on GitHub' };
      }

      return {
        valid: true,
        preview: {
          displayName: data.name || data.login,
          extra: `${data.public_repos} public repos · ${data.followers} followers`,
        },
      };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Failed to validate GitHub username',
      };
    }
  }

  async fetchStats(username: string): Promise<FetchStatsResult<GitHubStats>> {
    const token = getGitHubToken();

    if (token) {
      return this.fetchWithGraphQL(username, token);
    }

    return this.fetchWithREST(username);
  }

  private async fetchWithGraphQL(username: string, token: string): Promise<FetchStatsResult<GitHubStats>> {
    try {
      const { data } = await postJsonWithRetry<GHGraphQLResponse>(
        GITHUB_GRAPHQL,
        { query: USER_STATS_QUERY, variables: { username } },
        { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 15_000 },
      );

      if (data.errors?.length) {
        return { success: false, error: data.errors[0].message };
      }

      const user = data.data?.user;
      if (!user) {
        return { success: false, error: 'Username not found' };
      }

      const totalStars = user.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);
      const contributions = user.contributionsCollection;

      const stats: GitHubStats = {
        username,
        publicRepos: user.repositories.totalCount,
        totalCommits: contributions.totalCommitContributions + contributions.restrictedContributionsCount,
        followers: user.followers.totalCount,
        starsReceived: totalStars,
        pullRequests: contributions.totalPullRequestContributions,
        issues: contributions.totalIssueContributions,
        lastUpdated: new Date().toISOString(),
      };

      return { success: true, stats };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const rateLimited = message.includes('rate limit') || message.includes('403');
      return { success: false, error: message, rateLimited };
    }
  }

  private async fetchWithREST(username: string): Promise<FetchStatsResult<GitHubStats>> {
    try {
      const { data, status } = await fetchJsonWithRetry<GHRestUserResponse>(
        `${GITHUB_REST}/users/${encodeURIComponent(username)}`,
        { timeoutMs: 10_000, headers: { Accept: 'application/vnd.github.v3+json' } },
      );

      if (status === 404) {
        return { success: false, error: 'Username not found' };
      }

      // REST API has limited data — commits, stars, PRs, issues require
      // multiple additional requests. Set them to 0 for now.
      const stats: GitHubStats = {
        username,
        publicRepos: data.public_repos,
        totalCommits: 0, // Not available via simple REST
        followers: data.followers,
        starsReceived: 0,
        pullRequests: 0,
        issues: 0,
        lastUpdated: new Date().toISOString(),
      };

      return { success: true, stats };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message, rateLimited: message.includes('rate limit') };
    }
  }

  calculateNormalizedScore(stats: GitHubStats): number {
    // Weighted formula:
    //  - Commits: 30% (scaled: 200 → ~50, 500+ → ~100)
    //  - Stars received: 20% (scaled: 20 → ~50, 100+ → ~100)
    //  - PRs: 20% (scaled: 20 → ~50, 50+ → ~100)
    //  - Repos: 15% (scaled: 10 → ~50, 30+ → ~100)
    //  - Followers: 10% (scaled: 20 → ~50, 50+ → ~100)
    //  - Issues: 5% (scaled: 10 → ~50, 30+ → ~100)

    const commitScore = clamp0to100(safeDivide(stats.totalCommits, 5)); // 500 → 100
    const starsScore = clamp0to100(safeDivide(stats.starsReceived, 1)); // 100 → 100
    const prScore = clamp0to100(safeDivide(stats.pullRequests, 0.5)); // 50 → 100
    const repoScore = clamp0to100(safeDivide(stats.publicRepos, 0.3)); // 30 → 100
    const followerScore = clamp0to100(safeDivide(stats.followers, 0.5)); // 50 → 100
    const issueScore = clamp0to100(safeDivide(stats.issues, 0.3)); // 30 → 100

    const raw = (commitScore * 0.30) + (starsScore * 0.20) + (prScore * 0.20) +
                (repoScore * 0.15) + (followerScore * 0.10) + (issueScore * 0.05);
    return clamp0to100(Math.round(raw * 10) / 10);
  }
}
