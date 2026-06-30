/**
 * Codeforces platform adapter.
 *
 * Uses the official Codeforces REST API (no authentication required).
 * Rate limit: 1 request per 2 seconds.
 *
 * Endpoints used:
 *  - user.info?handles={handle}    → rating, rank, max rating
 *  - user.rating?handle={handle}   → contest history (count)
 *  - user.status?handle={handle}   → submissions (to count unique solved)
 */

import type { PlatformAdapter, ValidationResult, FetchStatsResult } from './types';
import type { CodeforcesStats } from '@/schema/leaderboard';
import { fetchJsonWithRetry, clamp0to100, safeDivide } from '../utils';

const CF_API = 'https://codeforces.com/api';

// ── Response Types ────────────────────────────────────────────────────────────

interface CFUserInfoResponse {
  status: string;
  result: Array<{
    handle: string;
    rating?: number;
    maxRating?: number;
    rank?: string;
    maxRank?: string;
    firstName?: string;
    lastName?: string;
  }>;
}

interface CFRatingResponse {
  status: string;
  result: Array<{
    contestId: number;
    contestName: string;
    newRating: number;
  }>;
}

interface CFSubmissionsResponse {
  status: string;
  result: Array<{
    problem: {
      contestId?: number;
      index: string;
      name: string;
    };
    verdict: string;
  }>;
}

// ── Adapter Implementation ────────────────────────────────────────────────────

export class CodeforcesAdapter implements PlatformAdapter<CodeforcesStats> {
  readonly platform = 'codeforces' as const;

  async validateUsername(handle: string): Promise<ValidationResult> {
    try {
      const { data, status } = await fetchJsonWithRetry<CFUserInfoResponse>(
        `${CF_API}/user.info?handles=${encodeURIComponent(handle)}`,
        { timeoutMs: 8000 },
      );

      if (status !== 200 || data.status !== 'OK' || !data.result?.length) {
        return { valid: false, error: 'Handle not found on Codeforces' };
      }

      const user = data.result[0];
      return {
        valid: true,
        preview: {
          displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.handle,
          rating: user.rating,
          rank: user.rank ?? 'Unrated',
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate';
      if (message.includes('429')) {
        return { valid: false, error: 'Rate limited — try again in a few seconds' };
      }
      return { valid: false, error: message };
    }
  }

  async fetchStats(handle: string): Promise<FetchStatsResult<CodeforcesStats>> {
    try {
      // 1. Fetch user info
      const userRes = await fetchJsonWithRetry<CFUserInfoResponse>(
        `${CF_API}/user.info?handles=${encodeURIComponent(handle)}`,
        { timeoutMs: 10_000 },
      );

      if (userRes.data.status !== 'OK' || !userRes.data.result?.length) {
        return { success: false, error: 'Handle not found' };
      }

      const user = userRes.data.result[0];

      // 2. Fetch contest history (for contest count)
      let contestCount = 0;
      try {
        const ratingRes = await fetchJsonWithRetry<CFRatingResponse>(
          `${CF_API}/user.rating?handle=${encodeURIComponent(handle)}`,
          { timeoutMs: 10_000 },
        );
        if (ratingRes.data.status === 'OK') {
          contestCount = ratingRes.data.result.length;
        }
      } catch {
        // Non-critical — default to 0
      }

      // 3. Fetch submissions (for problems solved count)
      let problemsSolved = 0;
      try {
        const subsRes = await fetchJsonWithRetry<CFSubmissionsResponse>(
          `${CF_API}/user.status?handle=${encodeURIComponent(handle)}`,
          { timeoutMs: 15_000 },
        );
        if (subsRes.data.status === 'OK') {
          // Count unique accepted problems
          const solved = new Set<string>();
          for (const sub of subsRes.data.result) {
            if (sub.verdict === 'OK') {
              const key = `${sub.problem.contestId ?? 'gym'}-${sub.problem.index}`;
              solved.add(key);
            }
          }
          problemsSolved = solved.size;
        }
      } catch {
        // Non-critical — default to 0
      }

      const stats: CodeforcesStats = {
        handle,
        currentRating: user.rating ?? 0,
        maxRating: user.maxRating ?? 0,
        currentRank: user.rank ?? 'Unrated',
        maxRank: user.maxRank ?? 'Unrated',
        contestCount,
        problemsSolved,
        lastUpdated: new Date().toISOString(),
      };

      return { success: true, stats };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const rateLimited = message.includes('429');
      return { success: false, error: message, rateLimited };
    }
  }

  calculateNormalizedScore(stats: CodeforcesStats): number {
    // Weighted formula:
    //  - Current rating: 45% (scaled: 1200 → ~40, 1900 → ~70, 2400+ → ~100)
    //  - Problems solved: 30% (scaled: 200 → ~50, 500+ → ~100)
    //  - Contest participation: 15% (scaled: 20 → ~50, 50+ → ~100)
    //  - Max rating bonus: 10%

    const ratingScore = clamp0to100(safeDivide(stats.currentRating, 25)); // 2500 → 100
    const solvedScore = clamp0to100(safeDivide(stats.problemsSolved, 5)); // 500 → 100
    const contestScore = clamp0to100(safeDivide(stats.contestCount, 0.5)); // 50 → 100
    const maxRatingScore = clamp0to100(safeDivide(stats.maxRating, 25)); // 2500 → 100

    const raw = (ratingScore * 0.45) + (solvedScore * 0.30) + (contestScore * 0.15) + (maxRatingScore * 0.10);
    return clamp0to100(Math.round(raw * 10) / 10);
  }
}
