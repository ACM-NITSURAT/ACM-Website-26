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
import { clamp0to100, safeDivide } from '../utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseStars(starsStr: string | undefined): number {
  if (!starsStr) return 0;
  const match = starsStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

async function fetchCodeChefProfile(username: string) {
  try {
    const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      cache: 'no-store'
    });
    
    if (res.status === 404) {
      return { success: false, error: 'User not found' };
    }
    
    const html = await res.text();
    
    const nameMatch = html.match(/class="m-username--link"[^>]*>([^<]+)/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/class="h2-style"[^>]*>([^<]+)<\/h2>/i);
    const ratingMatch = html.match(/class="rating-number"[^>]*>\s*(\d+)/);
    const highestMatch = html.match(/Highest Rating[\s\S]*?(?:<[^>]+>\s*)*(\d+)/i);
    const globalRankMatch = html.match(/Global Rank[\s\S]*?<a[^>]*>\s*([0-9]+)/i);

    let contestCount = 0;
    const contestsMatch = html.match(/"all":\[(.*?)\]/);
    if (contestsMatch && contestsMatch[1]) {
      try {
        const arr = JSON.parse(`[${contestsMatch[1]}]`);
        contestCount = arr.length;
      } catch (e) {}
    }

    if (!nameMatch && !ratingMatch) {
       return { success: false, error: 'Profile not found or invalid' };
    }

    const currentRating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0;
    
    let starsNum = 1;
    if (currentRating >= 2500) starsNum = 7;
    else if (currentRating >= 2200) starsNum = 6;
    else if (currentRating >= 2000) starsNum = 5;
    else if (currentRating >= 1800) starsNum = 4;
    else if (currentRating >= 1600) starsNum = 3;
    else if (currentRating >= 1400) starsNum = 2;

    return {
      success: true,
      name: nameMatch ? nameMatch[1].trim() : username,
      currentRating,
      highestRating: highestMatch ? parseInt(highestMatch[1], 10) : currentRating,
      stars: `${starsNum}★`,
      globalRank: globalRankMatch ? parseInt(globalRankMatch[1], 10) : 0,
      contestCount
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Fetch failed' };
  }
}

// ── Adapter Implementation ────────────────────────────────────────────────────

export class CodeChefAdapter implements PlatformAdapter<CodeChefStats> {
  readonly platform = 'codechef' as const;

  async validateUsername(username: string): Promise<ValidationResult> {
    const data = await fetchCodeChefProfile(username);

    if (!data.success) {
      return { valid: false, error: data.error || 'Username not found on CodeChef' };
    }

    return {
      valid: true,
      preview: {
        displayName: data.name || username,
        rating: data.currentRating,
        rank: data.stars || 'Unrated',
      },
    };
  }

  async fetchStats(username: string): Promise<FetchStatsResult<CodeChefStats>> {
    const data = await fetchCodeChefProfile(username);

    if (!data.success) {
      return { success: false, error: data.error || 'Username not found on CodeChef' };
    }

    const stats: CodeChefStats = {
      username,
      currentRating: data.currentRating ?? 0,
      highestRating: data.highestRating ?? 0,
      stars: parseStars(data.stars),
      contestCount: data.contestCount ?? 0,
      globalRank: data.globalRank ?? 0,
      lastUpdated: new Date().toISOString(),
    };

    return { success: true, stats };
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
