/**
 * Platform adapter interface and shared types.
 *
 * Every coding platform implements this interface.
 * Adding a new platform (e.g. AtCoder) means:
 *   1. Create atcoder.adapter.ts implementing PlatformAdapter
 *   2. Register it in registry.ts
 *   3. Add 'atcoder' to the Platform union in src/config/leaderboard.ts
 *
 * That's it. No other files need to change.
 */

import type { Platform } from '@/config/leaderboard';

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationPreview {
  /** Display name on the platform */
  displayName?: string;
  /** Rating if applicable */
  rating?: number;
  /** Rank string (e.g. "Candidate Master", "5★") */
  rank?: string;
  /** Any additional label to show */
  extra?: string;
}

export interface ValidationResult {
  /** Whether the username is valid and exists on the platform */
  valid: boolean;
  /** Preview data shown during real-time validation */
  preview?: ValidationPreview;
  /** Error message if validation failed */
  error?: string;
}

// ── Stats Fetching ────────────────────────────────────────────────────────────

export interface FetchStatsResult<T = unknown> {
  /** Whether the fetch succeeded */
  success: boolean;
  /** Fetched stats (typed per adapter) */
  stats?: T;
  /** Error message on failure */
  error?: string;
  /** True if the failure was due to rate limiting (should retry later) */
  rateLimited?: boolean;
}

// ── Upcoming Contests ─────────────────────────────────────────────────────────

export interface RawContest {
  name: string;
  platform: string;
  startTime: string;
  endTime: string;
  duration: number;
  url: string;
}

// ── The Adapter Interface ─────────────────────────────────────────────────────

export interface PlatformAdapter<TStats = unknown> {
  /** Which platform this adapter handles */
  readonly platform: Platform;

  /**
   * Validate that a username exists on the platform.
   * Returns a preview (rating, rank, etc.) if valid.
   * Called during real-time validation in the profile linking UI.
   */
  validateUsername(username: string): Promise<ValidationResult>;

  /**
   * Fetch full statistics for a user.
   * Called during background sync.
   */
  fetchStats(username: string): Promise<FetchStatsResult<TStats>>;

  /**
   * Calculate a normalized score (0–100) from raw stats.
   * Used internally for ACM Score computation.
   * The normalization formula is adapter-specific.
   */
  calculateNormalizedScore(stats: TStats): number;
}
