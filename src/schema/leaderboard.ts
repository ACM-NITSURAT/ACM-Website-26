/**
 * Leaderboard system TypeScript interfaces.
 *
 * Mirrors the Firestore data structure:
 *
 *   /leaderboard/{uid}           → LeaderboardEntry
 *   /contests/{id}               → UpcomingContest
 *   /config/leaderboard          → LeaderboardConfig
 *   /leaderboard_snapshots/{id}  → SnapshotRecord
 *
 * Raw platform data is stored as nested objects within the LeaderboardEntry.
 * Normalized scores are NEVER displayed — only used internally for ACM Score.
 */

import type { Platform, PlatformSyncStatus } from '@/config/leaderboard';

// ── Re-export for convenience ─────────────────────────────────────────────────

export type { Platform, PlatformSyncStatus };

// ── Firestore Timestamp ───────────────────────────────────────────────────────

/**
 * Firestore Timestamp representation.
 * When reading from Firestore, this will be a Firestore Timestamp object.
 * When writing, we often use FieldValue.serverTimestamp().
 * For type safety in both contexts, we use a flexible type.
 */
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
} | null;

// ── Platform Stats ────────────────────────────────────────────────────────────

export interface LeetCodeStats {
  username: string;
  rating: number;
  globalRank: number;
  contestCount: number;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  /** ISO string of last successful fetch */
  lastUpdated: string;
}

export interface CodeforcesStats {
  handle: string;
  currentRating: number;
  maxRating: number;
  currentRank: string;
  maxRank: string;
  contestCount: number;
  problemsSolved: number;
  /** ISO string of last successful fetch */
  lastUpdated: string;
}

export interface CodeChefStats {
  username: string;
  currentRating: number;
  highestRating: number;
  stars: number;
  contestCount: number;
  globalRank: number;
  /** ISO string of last successful fetch */
  lastUpdated: string;
}

export interface GitHubStats {
  username: string;
  publicRepos: number;
  totalCommits: number;
  followers: number;
  starsReceived: number;
  pullRequests: number;
  issues: number;
  /** ISO string of last successful fetch */
  lastUpdated: string;
}

/** Union of all platform stat types */
export type PlatformStats = LeetCodeStats | CodeforcesStats | CodeChefStats | GitHubStats;

// ── ACM Score ─────────────────────────────────────────────────────────────────

export interface AcmScore {
  /** Computed ACM score (0–100 scale) */
  score: number;
  /** Overall rank among all students */
  overallRank: number;
  /** Rank within the student's branch */
  branchRank: number;
  /** Rank within the student's current year */
  yearRank: number;
  /** ISO string of last calculation */
  lastCalculated: string;
}

// ── Sync Metadata ─────────────────────────────────────────────────────────────

export interface SyncError {
  platform: Platform;
  message: string;
  timestamp: string;
}

export interface SyncMeta {
  /** ISO string of last automatic (cron) sync */
  lastSync: string | null;
  /** ISO string of last user-triggered manual refresh */
  lastManualRefresh: string | null;
  /** Current sync status */
  status: 'idle' | 'syncing' | 'error';
  /** Recent errors (kept last 10) */
  errors: SyncError[];
}

// ── Weekly Snapshot ───────────────────────────────────────────────────────────

export interface WeeklySnapshot {
  /** ISO week identifier, e.g. "2026-W27" */
  weekOf: string;
  cfRating: number | null;
  lcRating: number | null;
  ccRating: number | null;
  ghCommits: number | null;
  acmScore: number;
}

// ── Leaderboard Entry ─────────────────────────────────────────────────────────

/**
 * One Firestore document per student at /leaderboard/{uid}.
 *
 * Denormalizes some user fields (name, branch, etc.) for efficient
 * leaderboard queries without joining with the users collection.
 */
export interface LeaderboardEntry {
  /** Firebase Auth UID — mirrors the Firestore document ID */
  uid: string;

  // ── Denormalized user info ────────────────────────────────────────────────
  displayName: string;
  firstName: string;
  lastName: string;
  /** URL-friendly slug: "siddharth-sheth-u24cs024" */
  slug: string;
  /** Canonical branch code (e.g. 'CSE') */
  branch: string;
  /** Current academic year (1–4 or 1–5) */
  currentYear: number;
  /** Expected graduation year (e.g. 2028) */
  graduationBatch: number;
  /** Profile image URL */
  profileImageUrl: string;
  /** Roll number */
  rollNumber: string;

  // ── Platform stats (null = not linked) ────────────────────────────────────
  leetcode: LeetCodeStats | null;
  codeforces: CodeforcesStats | null;
  codechef: CodeChefStats | null;
  github: GitHubStats | null;

  // ── Computed score ────────────────────────────────────────────────────────
  acm: AcmScore;

  // ── Sync state ────────────────────────────────────────────────────────────
  sync: SyncMeta;

  // ── Per-platform link/sync status ─────────────────────────────────────────
  platformStatus: Record<Platform, PlatformSyncStatus>;

  // ── Latest weekly snapshot for delta display ──────────────────────────────
  lastSnapshot: WeeklySnapshot | null;
  /** Previous week's snapshot — used to compute deltas */
  previousSnapshot: WeeklySnapshot | null;
}

// ── Upcoming Contests ─────────────────────────────────────────────────────────

export interface UpcomingContest {
  /** Firestore document ID */
  id: string;
  /** Platform name (may include non-supported platforms from Kontests) */
  platform: string;
  /** Contest name */
  name: string;
  /** ISO string of contest start time */
  startTime: string;
  /** ISO string of contest end time */
  endTime: string;
  /** Duration in seconds */
  duration: number;
  /** URL to the contest page / registration */
  url: string;
  /** Whether the contest is currently active */
  isActive: boolean;
  /** ISO string of when this record was last fetched */
  lastFetched: string;
}

// ── Leaderboard Config ────────────────────────────────────────────────────────

/**
 * Stored at /config/leaderboard in Firestore.
 * Allows admins to modify scoring weights without redeploying.
 */
export interface LeaderboardConfig {
  /** Platform weights for ACM Score calculation. Must sum to 1.0. */
  weights: Record<Platform, number>;
  /** Hours between automatic syncs */
  syncIntervalHours: number;
  /** Minutes between manual refresh attempts per user */
  manualRefreshCooldownMinutes: number;
  /** Which platforms are currently enabled */
  enabledPlatforms: Platform[];
  /** Current season identifier. null = lifetime only. */
  currentSeason: string | null;
}

// ── Snapshot Record ───────────────────────────────────────────────────────────

/**
 * Historical snapshot stored at /leaderboard_snapshots/{uid}_{weekId}.
 * Used for long-term trend analysis (future feature).
 */
export interface SnapshotRecord {
  uid: string;
  /** e.g. "2026-W27" */
  weekId: string;
  snapshot: WeeklySnapshot;
}

// ── Hall of Fame Record ───────────────────────────────────────────────────────

export interface HallOfFameRecord {
  category: string;
  label: string;
  value: number;
  studentName: string;
  studentSlug: string;
  platform?: Platform;
}

// ── Department Cup Entry ──────────────────────────────────────────────────────

export interface DepartmentCupEntry {
  branchCode: string;
  branchName: string;
  averageAcmScore: number;
  studentCount: number;
  rank: number;
}
