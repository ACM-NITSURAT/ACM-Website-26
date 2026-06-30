/**
 * LeetCode platform adapter.
 *
 * Uses LeetCode's public GraphQL endpoint (no authentication required).
 * Rate limit: ~20 req/min (generous for our use case).
 *
 * Endpoints used:
 *  - matchedUser(username)       → profile info
 *  - userContestRanking(username) → rating, contest count, global rank
 *  - matchedUser.submitStatsGlobal → easy/medium/hard breakdown
 */

import type { PlatformAdapter, ValidationResult, FetchStatsResult } from './types';
import type { LeetCodeStats } from '@/schema/leaderboard';
import { postJsonWithRetry, clamp0to100, safeDivide } from '../utils';

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

// ── GraphQL Queries ───────────────────────────────────────────────────────────

const USER_PROFILE_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        realName
        ranking
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

const CONTEST_RANKING_QUERY = `
  query userContestRankingInfo($username: String!) {
    userContestRanking(username: $username) {
      rating
      globalRanking
      attendedContestsCount
    }
  }
`;

// ── Response Types ────────────────────────────────────────────────────────────

interface LCProfileResponse {
  data: {
    matchedUser: {
      username: string;
      profile: {
        realName: string;
        ranking: number;
      };
      submitStatsGlobal: {
        acSubmissionNum: Array<{
          difficulty: string;
          count: number;
        }>;
      };
    } | null;
  };
}

interface LCContestResponse {
  data: {
    userContestRanking: {
      rating: number;
      globalRanking: number;
      attendedContestsCount: number;
    } | null;
  };
}

// ── Adapter Implementation ────────────────────────────────────────────────────

export class LeetCodeAdapter implements PlatformAdapter<LeetCodeStats> {
  readonly platform = 'leetcode' as const;

  async validateUsername(username: string): Promise<ValidationResult> {
    try {
      const { data } = await postJsonWithRetry<LCProfileResponse>(
        LEETCODE_GRAPHQL,
        { query: USER_PROFILE_QUERY, variables: { username } },
        { timeoutMs: 8000 },
      );

      const user = data.data?.matchedUser;
      if (!user) {
        return { valid: false, error: 'Username not found on LeetCode' };
      }

      // Also fetch contest info for the preview
      let rating: number | undefined;
      try {
        const contestRes = await postJsonWithRetry<LCContestResponse>(
          LEETCODE_GRAPHQL,
          { query: CONTEST_RANKING_QUERY, variables: { username } },
          { timeoutMs: 8000 },
        );
        rating = contestRes.data.data?.userContestRanking?.rating;
      } catch {
        // Contest data is optional for validation preview
      }

      const totalSolved = user.submitStatsGlobal.acSubmissionNum
        .find((s) => s.difficulty === 'All')?.count ?? 0;

      return {
        valid: true,
        preview: {
          displayName: user.profile.realName || user.username,
          rating: rating ? Math.round(rating) : undefined,
          extra: `${totalSolved} problems solved`,
        },
      };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Failed to validate LeetCode username',
      };
    }
  }

  async fetchStats(username: string): Promise<FetchStatsResult<LeetCodeStats>> {
    try {
      // Fetch profile + submission stats
      const profileRes = await postJsonWithRetry<LCProfileResponse>(
        LEETCODE_GRAPHQL,
        { query: USER_PROFILE_QUERY, variables: { username } },
        { timeoutMs: 10_000 },
      );

      const user = profileRes.data.data?.matchedUser;
      if (!user) {
        return { success: false, error: 'Username not found', rateLimited: false };
      }

      // Fetch contest ranking
      const contestRes = await postJsonWithRetry<LCContestResponse>(
        LEETCODE_GRAPHQL,
        { query: CONTEST_RANKING_QUERY, variables: { username } },
        { timeoutMs: 10_000 },
      );

      const contest = contestRes.data.data?.userContestRanking;
      const submissions = user.submitStatsGlobal.acSubmissionNum;

      const findCount = (difficulty: string) =>
        submissions.find((s) => s.difficulty === difficulty)?.count ?? 0;

      const stats: LeetCodeStats = {
        username,
        rating: contest ? Math.round(contest.rating) : 0,
        globalRank: contest?.globalRanking ?? 0,
        contestCount: contest?.attendedContestsCount ?? 0,
        totalSolved: findCount('All'),
        easySolved: findCount('Easy'),
        mediumSolved: findCount('Medium'),
        hardSolved: findCount('Hard'),
        lastUpdated: new Date().toISOString(),
      };

      return { success: true, stats };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const rateLimited = message.includes('429') || message.includes('rate');
      return { success: false, error: message, rateLimited };
    }
  }

  calculateNormalizedScore(stats: LeetCodeStats): number {
    // Weighted formula:
    //  - Rating contributes 40% (scaled: 1500 → ~50, 2500+ → ~100)
    //  - Problems solved contributes 40% (scaled: 300 problems → ~50, 1000+ → ~100)
    //  - Contest participation contributes 20% (scaled: 20 contests → ~50, 50+ → ~100)

    const ratingScore = clamp0to100(safeDivide(stats.rating, 30)); // 3000 → 100
    const solvedScore = clamp0to100(safeDivide(stats.totalSolved, 10)); // 1000 → 100
    const contestScore = clamp0to100(safeDivide(stats.contestCount, 0.5)); // 50 → 100

    // Weight harder problems more
    const hardBonus = clamp0to100(stats.hardSolved * 0.5); // Up to 200 hard = 100

    const raw = (ratingScore * 0.35) + (solvedScore * 0.30) + (contestScore * 0.15) + (hardBonus * 0.20);
    return clamp0to100(Math.round(raw * 10) / 10);
  }
}
