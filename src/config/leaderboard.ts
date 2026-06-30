/**
 * Leaderboard system configuration.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  SINGLE SOURCE OF TRUTH                                                    │
 * │                                                                            │
 * │  Every leaderboard-related constant lives here. Import from this file      │
 * │  instead of scattering magic strings throughout the codebase.              │
 * │                                                                            │
 * │  To add a new platform:                                                    │
 * │    1. Add to the Platform type and PLATFORMS map below                      │
 * │    2. Create an adapter in src/server/leaderboard/adapters/                │
 * │    3. Register it in adapters/registry.ts                                  │
 * │                                                                            │
 * │  To add a new branch:                                                      │
 * │    1. Add to BRANCH_MAP below                                              │
 * │                                                                            │
 * │  ACM Score weights stored in Firestore take precedence over the defaults   │
 * │  here. Update Firestore /config/leaderboard to change weights without      │
 * │  redeploying.                                                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// ── Platform Types ────────────────────────────────────────────────────────────

/** Supported coding platforms. Extend this union to add a new platform. */
export type Platform = 'leetcode' | 'codeforces' | 'codechef' | 'github';

/** All platform identifiers as an array (useful for iteration). */
export const ALL_PLATFORMS: readonly Platform[] = [
  'leetcode',
  'codeforces',
  'codechef',
  'github',
] as const;

/** Display metadata for each platform. */
export interface PlatformMeta {
  /** Human-readable name */
  displayName: string;
  /** Accent color (hex) used in UI badges, borders, glows */
  color: string;
  /** SVG icon name or emoji fallback */
  icon: string;
  /** URL template — replace {username} with the actual handle */
  profileUrl: string;
}

export const PLATFORMS: Record<Platform, PlatformMeta> = {
  leetcode: {
    displayName: 'LeetCode',
    color: '#FFA116',
    icon: 'leetcode',
    profileUrl: 'https://leetcode.com/{username}',
  },
  codeforces: {
    displayName: 'Codeforces',
    color: '#1890FF',
    icon: 'codeforces',
    profileUrl: 'https://codeforces.com/profile/{username}',
  },
  codechef: {
    displayName: 'CodeChef',
    color: '#5B4638',
    icon: 'codechef',
    profileUrl: 'https://www.codechef.com/users/{username}',
  },
  github: {
    displayName: 'GitHub',
    color: '#F0F0F0',
    icon: 'github',
    profileUrl: 'https://github.com/{username}',
  },
};

// ── Branch Mapping ────────────────────────────────────────────────────────────

/**
 * Maps the 2-letter code found in SVNIT roll numbers / emails
 * to the canonical branch code and full display name.
 *
 * Roll format: u24cs024 → emailCode = 'cs'
 */
export interface BranchInfo {
  /** Canonical uppercase code used for filtering (e.g. 'CSE') */
  code: string;
  /** Full display name (e.g. 'Computer Science & Engineering') */
  displayName: string;
}

/**
 * Email branch code (lowercase, 2 chars) → BranchInfo.
 *
 * To add a new department, just add a row here.
 */
export const BRANCH_MAP: Record<string, BranchInfo> = {
  cs: { code: 'CSE', displayName: 'Computer Science & Engineering' },
  ai: { code: 'AI',  displayName: 'Artificial Intelligence' },
  ec: { code: 'ECE', displayName: 'Electronics & Communication Engineering' },
  ee: { code: 'EE',  displayName: 'Electrical Engineering' },
  me: { code: 'ME',  displayName: 'Mechanical Engineering' },
  ce: { code: 'CE',  displayName: 'Civil Engineering' },
  ch: { code: 'CHE', displayName: 'Chemical Engineering' },
};

/** All canonical branch codes for filter dropdowns. */
export const ALL_BRANCHES: readonly BranchInfo[] = Object.values(BRANCH_MAP);

/** All canonical branch codes as strings. */
export const ALL_BRANCH_CODES: readonly string[] = ALL_BRANCHES.map((b) => b.code);

// ── ACM Score Defaults ────────────────────────────────────────────────────────

/**
 * Default scoring weights per platform.
 *
 * These are used as fallback when Firestore `/config/leaderboard` doesn't
 * exist or is missing the `weights` field. To change weights without
 * redeploying, update the Firestore document.
 */
export const DEFAULT_WEIGHTS: Record<Platform, number> = {
  leetcode:   0.30,
  codeforces: 0.30,
  codechef:   0.20,
  github:     0.20,
};

// ── Sync Settings ─────────────────────────────────────────────────────────────

/** Hours between automatic cron syncs. */
export const SYNC_INTERVAL_HOURS = 6;

/** Minimum minutes between manual "Refresh Stats" presses per user. */
export const MANUAL_REFRESH_COOLDOWN_MINUTES = 30;

/** Maximum number of users to sync in a single cron run (prevents timeout). */
export const SYNC_BATCH_SIZE = 50;

/** Delay (ms) between individual API calls within a batch to respect rate limits. */
export const SYNC_RATE_LIMIT_DELAY_MS = 200;

/** Maximum retry attempts for a single API call. */
export const SYNC_MAX_RETRIES = 3;

// ── Leaderboard UI Settings ──────────────────────────────────────────────────

/** Default number of rows per page in the leaderboard table. */
export const LEADERBOARD_PAGE_SIZE = 25;

/** Maximum allowed page size (prevents abuse). */
export const LEADERBOARD_MAX_PAGE_SIZE = 100;

/** Debounce delay (ms) for the search input. */
export const SEARCH_DEBOUNCE_MS = 300;

// ── Platform Status ──────────────────────────────────────────────────────────

export type PlatformSyncStatus =
  | 'synced'
  | 'waiting'
  | 'invalid'
  | 'rate_limited'
  | 'not_linked';

export const PLATFORM_STATUS_META: Record<PlatformSyncStatus, { label: string; color: string }> = {
  synced:       { label: 'Synced',       color: '#22C55E' },
  waiting:      { label: 'Waiting',      color: '#EAB308' },
  invalid:      { label: 'Invalid',      color: '#EF4444' },
  rate_limited: { label: 'Rate Limited', color: '#F97316' },
  not_linked:   { label: 'Not Linked',   color: '#6B7280' },
};

// ── Firestore Paths ──────────────────────────────────────────────────────────

/** Firestore collection/document paths used by the leaderboard system. */
export const FIRESTORE_PATHS = {
  /** Per-user leaderboard document: /leaderboard/{uid} */
  leaderboardDoc: (uid: string) => `leaderboard/${uid}`,
  /** Leaderboard collection */
  leaderboardCollection: 'leaderboard',
  /** Config document with weights, sync interval, etc. */
  configDoc: 'config/leaderboard',
  /** Upcoming contests collection */
  contestsCollection: 'contests',
  /** Weekly snapshot: /leaderboard_snapshots/{uid}_{weekId} */
  snapshotDoc: (uid: string, weekId: string) => `leaderboard_snapshots/${uid}_${weekId}`,
  /** Snapshots collection */
  snapshotsCollection: 'leaderboard_snapshots',
} as const;
