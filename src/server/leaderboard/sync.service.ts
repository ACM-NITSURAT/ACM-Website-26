/**
 * Leaderboard sync service.
 *
 * Orchestrates the background synchronization process:
 *  1. Find all users with linked platform usernames
 *  2. Skip users synced within the threshold (smart sync)
 *  3. Fetch stats from each linked platform via adapters
 *  4. Write raw stats to Firestore /leaderboard/{uid}
 *  5. Recalculate ACM scores after all stats are updated
 *
 * Designed to be called from:
 *  - Vercel Cron (POST /api/leaderboard/sync) — full sync
 *  - Manual refresh (POST /api/leaderboard/sync/user) — single user
 */

import adminDb from '@/lib/firebase-admin/firestore';
import { ALL_PLATFORMS, SYNC_BATCH_SIZE, SYNC_INTERVAL_HOURS, FIRESTORE_PATHS, type Platform } from '@/config/leaderboard';
import { getAdapter } from './adapters/registry';
import { isStale, rateLimitedBatch } from './utils';
import { recalculateAllScores, recalculateUserScore } from './scoring.service';
import type { User } from '@/schema/user';
import type { LeaderboardEntry, SyncMeta, SyncError } from '@/schema/leaderboard';
import type { PlatformSyncStatus } from '@/config/leaderboard';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SyncSummary {
  total: number;
  synced: number;
  skipped: number;
  errors: number;
  details: Array<{ uid: string; status: string; errors?: string[] }>;
}

interface UserWithPlatforms {
  uid: string;
  displayName: string;
  firstName: string;
  lastName: string;
  slug: string;
  branch: string;
  currentYear: number;
  graduationBatch: number;
  profileImageUrl: string;
  rollNumber: string;
  platforms: Partial<Record<Platform, string>>;
}

// ── Platform username field mapping ───────────────────────────────────────────

const PLATFORM_FIELDS: Record<Platform, keyof User> = {
  leetcode:   'leetcodeUsername',
  codeforces: 'codeforcesHandle',
  codechef:   'codechefUsername',
  github:     'githubUsername',
};

// ── Full Sync ─────────────────────────────────────────────────────────────────

/**
 * Run a full sync for all users with linked platforms.
 * Called by the Vercel Cron job every 6 hours.
 */
export async function runFullSync(): Promise<SyncSummary> {
  const users = await getLinkedUsers();
  const summary: SyncSummary = {
    total: users.length,
    synced: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  // Process in batches to avoid Vercel function timeout
  const batches: UserWithPlatforms[][] = [];
  for (let i = 0; i < users.length; i += SYNC_BATCH_SIZE) {
    batches.push(users.slice(i, i + SYNC_BATCH_SIZE));
  }

  for (const batch of batches) {
    await rateLimitedBatch(batch, async (user) => {
      const result = await syncSingleUser(user);
      summary.details.push(result);

      if (result.status === 'synced') summary.synced++;
      else if (result.status === 'skipped') summary.skipped++;
      else summary.errors++;
    }, 500); // 500ms between users
  }

  // Recalculate ACM scores after all stats are updated
  if (summary.synced > 0) {
    try {
      await recalculateAllScores();
    } catch (err) {
      console.error('[sync] Failed to recalculate ACM scores:', err);
    }
  }

  return summary;
}

// ── Single User Sync ──────────────────────────────────────────────────────────

/**
 * Sync a single user's platform stats.
 * Used for both cron (with staleness check) and manual refresh (forced).
 */
export async function syncSingleUser(
  user: UserWithPlatforms,
  force: boolean = false,
): Promise<{ uid: string; status: string; errors?: string[] }> {
  const leaderboardRef = adminDb.doc(FIRESTORE_PATHS.leaderboardDoc(user.uid));
  const existingSnap = await leaderboardRef.get();
  const existing = existingSnap.data() as LeaderboardEntry | undefined;

  // Smart sync: skip if recently synced (unless forced)
  if (!force && existing?.sync?.lastSync && !isStale(existing.sync.lastSync, SYNC_INTERVAL_HOURS)) {
    return { uid: user.uid, status: 'skipped' };
  }

  const errors: string[] = [];
  const platformStatus: Record<string, PlatformSyncStatus> = {};
  const platformData: Record<string, unknown> = {};

  // Fetch stats from each linked platform
  for (const platform of ALL_PLATFORMS) {
    const username = user.platforms[platform];
    if (!username) {
      platformStatus[platform] = 'not_linked';
      platformData[platform] = null; // User unlinked this platform, clear stats
      continue;
    }

    try {
      const adapter = getAdapter(platform);
      const result = await adapter.fetchStats(username);

      if (result.success && result.stats) {
        platformData[platform] = result.stats;
        platformStatus[platform] = 'synced';
      } else {
        platformData[platform] = existing?.[platform] ?? null;
        platformStatus[platform] = result.rateLimited ? 'rate_limited' : 'invalid';
        errors.push(`${platform}: ${result.error}`);
      }
    } catch (err) {
      platformData[platform] = existing?.[platform] ?? null;
      platformStatus[platform] = 'invalid';
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${platform}: ${message}`);
    }
  }

  // Build sync metadata
  const syncErrors: SyncError[] = errors.map((msg) => {
    const [platform, ...rest] = msg.split(': ');
    return {
      platform: platform as Platform,
      message: rest.join(': '),
      timestamp: new Date().toISOString(),
    };
  });

  // Keep only last 10 errors
  const previousErrors = existing?.sync?.errors ?? [];
  const allErrors = [...syncErrors, ...previousErrors].slice(0, 10);

  const syncMeta: SyncMeta = {
    lastSync: new Date().toISOString(),
    lastManualRefresh: force ? new Date().toISOString() : (existing?.sync?.lastManualRefresh ?? null),
    status: errors.length > 0 ? 'error' : 'idle',
    errors: allErrors,
  };

  // Import parseRollNumber dynamically to compute currentYear fresh
  const { parseRollNumber } = await import('@/lib/validators/roll-number-parser');
  const parsed = parseRollNumber(user.rollNumber);

  // Write the leaderboard document
  const entry: Omit<LeaderboardEntry, 'acm' | 'lastSnapshot' | 'previousSnapshot'> & {
    acm: LeaderboardEntry['acm'];
    lastSnapshot: LeaderboardEntry['lastSnapshot'];
    previousSnapshot: LeaderboardEntry['previousSnapshot'];
  } = {
    uid: user.uid,
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    slug: user.slug,
    branch: user.branch,
    currentYear: parsed?.currentYear ?? user.currentYear,
    graduationBatch: user.graduationBatch,
    profileImageUrl: user.profileImageUrl,
    rollNumber: user.rollNumber,
    leetcode: (platformData.leetcode as LeaderboardEntry['leetcode']) ?? null,
    codeforces: (platformData.codeforces as LeaderboardEntry['codeforces']) ?? null,
    codechef: (platformData.codechef as LeaderboardEntry['codechef']) ?? null,
    github: (platformData.github as LeaderboardEntry['github']) ?? null,
    acm: existing?.acm ?? { score: 0, overallRank: 0, branchRank: 0, yearRank: 0, lastCalculated: '' },
    sync: syncMeta,
    platformStatus: platformStatus as Record<Platform, PlatformSyncStatus>,
    lastSnapshot: existing?.lastSnapshot ?? null,
    previousSnapshot: existing?.previousSnapshot ?? null,
  };

  await leaderboardRef.set(entry, { merge: true });

  return {
    uid: user.uid,
    status: errors.length > 0 ? 'partial' : 'synced',
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ── Sync a single user by UID (for manual refresh) ───────────────────────────

/**
 * Sync a single user by UID. Used for manual "Refresh Stats" button.
 */
export async function syncUserByUid(uid: string): Promise<{ uid: string; status: string; errors?: string[] }> {
  const userSnap = await adminDb.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    return { uid, status: 'error', errors: ['User not found'] };
  }

  const userData = userSnap.data() as User;
  const user = buildUserWithPlatforms(uid, userData);

  if (Object.keys(user.platforms).length === 0) {
    // User unlinked all platforms. Remove them from the leaderboard entirely.
    await adminDb.doc(FIRESTORE_PATHS.leaderboardDoc(uid)).delete();
    
    // Recalculate ranks for everyone else since a user was removed
    try {
      await recalculateAllScores();
    } catch (err) {
      console.error('[syncUserByUid] Failed to recalculate score:', err);
    }
    
    return { uid, status: 'synced', errors: [] };
  }

  const result = await syncSingleUser(user, true);

  // Recalculate this user's score
  try {
    await recalculateUserScore(uid);
  } catch (err) {
    console.error('[syncUserByUid] Failed to recalculate score:', err);
  }

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Query all users who have at least one platform username linked.
 */
async function getLinkedUsers(): Promise<UserWithPlatforms[]> {
  // Firestore doesn't support OR queries across different fields easily.
  // We query ALL users and filter in memory — fine for 500–3000 students.
  const snapshot = await adminDb.collection('users').get();
  const users: UserWithPlatforms[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as User;
    const platforms: Partial<Record<Platform, string>> = {};

    for (const platform of ALL_PLATFORMS) {
      const field = PLATFORM_FIELDS[platform];
      const value = data[field] as string | null;
      if (value) {
        platforms[platform] = value;
      }
    }

    // Skip users with no linked platforms
    if (Object.keys(platforms).length === 0) continue;

    users.push(buildUserWithPlatforms(doc.id, data, platforms));
  }

  return users;
}

function buildUserWithPlatforms(
  uid: string,
  data: User,
  platforms?: Partial<Record<Platform, string>>,
): UserWithPlatforms {
  // Build platforms map if not provided
  if (!platforms) {
    platforms = {};
    for (const platform of ALL_PLATFORMS) {
      const field = PLATFORM_FIELDS[platform];
      const value = data[field] as string | null;
      if (value) {
        platforms[platform] = value;
      }
    }
  }

  // Import parseRollNumber synchronously isn't possible here,
  // so we rely on stored values or defaults
  return {
    uid,
    displayName: `${data.firstName} ${data.lastName}`.trim(),
    firstName: data.firstName,
    lastName: data.lastName,
    slug: data.leaderboardSlug ?? data.rollNumber,
    branch: data.branch ?? 'Unknown',
    currentYear: 1, // Will be recalculated during sync
    graduationBatch: data.graduationBatch ?? 0,
    profileImageUrl: data.profileImageUrl,
    rollNumber: data.rollNumber,
    platforms,
  };
}
