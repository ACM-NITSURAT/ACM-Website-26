/**
 * CodeChef platform adapter.
 *
 * Uses the CodeChef unofficial API endpoint.
 * Falls back to scraping the public profile page if needed.
 *
 * Note: CodeChef's official API requires OAuth which is overly complex
 * for read-only public profile data. The unofficial endpoint at
 * /users/{username} returns JSON when Accept header is set.
 */

import type { PlatformAdapter, ValidationResult, FetchStatsResult } from './types';
import type { CodeChefStats } from '@/schema/leaderboard';
import { fetchJsonWithRetry, clamp0to100, safeDivide } from '../utils';

const CODECHEF_API = 'https://codechef-api.vercel.app/handle';

// ── Response Types ────────────────────────────────────────────────────────────

interface CCApiResponse {
  success: boolean;
  profile?: string;
  name?: string;
  currentRating?: number;
  highestRating?: number;
  stars?: string;
  countryRank?: number;
  globalRank?: number;
  countryName?: string;
  ratingData?: Array<{
    code: string;
    name: string;
    rating: string;
    rank: string;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseStars(starsStr: string | undefined): number {
  if (!starsStr) return 0;
  // Format: "3★" or "3 stars" etc.
  const match = starsStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ── Adapter Implementation ────────────────────────────────────────────────────

export class CodeChefAdapter implements PlatformAdapter<CodeChefStats> {
  readonly platform = 'codechef' as const;

  async validateUsername(username: string): Promise<ValidationResult> {
    try {
      const { data, status } = await fetchJsonWithRetry<CCApiResponse>(
        `${CODECHEF_API}/${encodeURIComponent(username)}`,
        { timeoutMs: 10_000 },
      );

      if (status !== 200 || !data.success) {
        return { valid: false, error: 'Username not found on CodeChef' };
      }

      return {
        valid: true,
        preview: {
          displayName: data.name || username,
          rating: data.currentRating,
          rank: data.stars || 'Unrated',
        },
      };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Failed to validate CodeChef username',
      };
    }
  }

  async fetchStats(username: string): Promise<FetchStatsResult<CodeChefStats>> {
    try {
      const { data, status } = await fetchJsonWithRetry<CCApiResponse>(
        `${CODECHEF_API}/${encodeURIComponent(username)}`,
        { timeoutMs: 15_000 },
      );

      if (status !== 200 || !data.success) {
        return { success: false, error: 'Username not found on CodeChef' };
      }

      const contestCount = data.ratingData?.length ?? 0;

      const stats: CodeChefStats = {
        username,
        currentRating: data.currentRating ?? 0,
        highestRating: data.highestRating ?? 0,
        stars: parseStars(data.stars),
        contestCount,
        globalRank: data.globalRank ?? 0,
        lastUpdated: new Date().toISOString(),
      };

      return { success: true, stats };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const rateLimited = message.includes('429') || message.includes('rate');
      return { success: false, error: message, rateLimited };
    }
  }

  calculateNormalizedScore(stats: CodeChefStats): number {
    // Weighted formula:
    //  - Current rating: 45% (scaled: 1500 → ~50, 2200+ → ~100)
    //  - Highest rating: 15% (bonus for peak performance)
    //  - Stars: 15% (scaled: 1★ → 20, 5★ → 100, 7★ → 100)
    //  - Contest participation: 25% (scaled: 15 → ~50, 40+ → ~100)

    const ratingScore = clamp0to100(safeDivide(stats.currentRating, 22)); // 2200 → 100
    const highestScore = clamp0to100(safeDivide(stats.highestRating, 22));
    const starsScore = clamp0to100(stats.stars * 20); // 5★ = 100
    const contestScore = clamp0to100(safeDivide(stats.contestCount, 0.4)); // 40 → 100

    const raw = (ratingScore * 0.45) + (highestScore * 0.15) + (starsScore * 0.15) + (contestScore * 0.25);
    return clamp0to100(Math.round(raw * 10) / 10);
  }
}
