/**
 * Contest fetching service.
 *
 * Uses the Kontests API (https://kontests.net) to fetch upcoming contests
 * from all supported platforms in a single request.
 *
 * Also supports fetching from individual platform APIs as fallback.
 */

import adminDb from '@/lib/firebase-admin/firestore';
import { FIRESTORE_PATHS } from '@/config/leaderboard';
import { fetchJsonWithRetry } from './utils';
import type { UpcomingContest } from '@/schema/leaderboard';

const KONTESTS_API = 'https://kontests.net/api/v1/all';

// ── Response Types ────────────────────────────────────────────────────────────

interface KontestsResponse {
  name: string;
  url: string;
  start_time: string;
  end_time: string;
  duration: string; // in seconds as a string
  site: string;
  in_24_hours: string;
  status: string;
}

// ── Platform name mapping ─────────────────────────────────────────────────────

/**
 * Maps Kontests API `site` values to our platform identifiers.
 * Non-matching sites are kept as-is for display purposes.
 */
const SITE_TO_PLATFORM: Record<string, string> = {
  'CodeForces':      'codeforces',
  'CodeForces::Gym': 'codeforces',
  'CodeChef':        'codechef',
  'LeetCode':        'leetcode',
  'HackerRank':      'hackerrank',
  'HackerEarth':     'hackerearth',
  'AtCoder':         'atcoder',
  'TopCoder':        'topcoder',
  'CS Academy':      'csacademy',
  'Kick Start':      'kickstart',
};

// ── Fetch & Store ─────────────────────────────────────────────────────────────

/**
 * Fetch upcoming contests from Kontests API and store in Firestore.
 * Automatically cleans up expired contests.
 */
export async function syncUpcomingContests(): Promise<{ added: number; removed: number }> {
  // 1. Fetch from Kontests API
  const { data } = await fetchJsonWithRetry<KontestsResponse[]>(
    KONTESTS_API,
    { timeoutMs: 15_000 },
  );

  const now = new Date();
  const contests: UpcomingContest[] = [];

  for (const raw of data) {
    const startTime = new Date(raw.start_time);
    const endTime = new Date(raw.end_time);

    // Skip contests that have already ended
    if (endTime <= now) continue;

    const platform = SITE_TO_PLATFORM[raw.site] ?? raw.site.toLowerCase().replace(/\s+/g, '_');
    const duration = parseInt(raw.duration, 10) || 0;

    // Generate a stable ID from platform + name + start time
    const id = generateContestId(platform, raw.name, raw.start_time);

    contests.push({
      id,
      platform,
      name: raw.name,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      url: raw.url,
      isActive: startTime <= now && endTime > now,
      lastFetched: now.toISOString(),
    });
  }

  // 2. Write to Firestore (batch)
  const batch = adminDb.batch();
  let added = 0;

  for (const contest of contests) {
    const ref = adminDb.collection(FIRESTORE_PATHS.contestsCollection).doc(contest.id);
    batch.set(ref, contest, { merge: true });
    added++;
  }

  // 3. Clean up expired contests
  let removed = 0;
  const existingSnap = await adminDb.collection(FIRESTORE_PATHS.contestsCollection).get();

  for (const doc of existingSnap.docs) {
    const existing = doc.data() as UpcomingContest;
    const endTime = new Date(existing.endTime);

    if (endTime <= now) {
      batch.delete(doc.ref);
      removed++;
    }
  }

  await batch.commit();

  return { added, removed };
}

/**
 * Get all upcoming contests, optionally filtered by platform.
 */
export async function getUpcomingContests(
  platformFilter?: string,
): Promise<UpcomingContest[]> {
  let query = adminDb
    .collection(FIRESTORE_PATHS.contestsCollection)
    .orderBy('startTime', 'asc');

  if (platformFilter) {
    query = query.where('platform', '==', platformFilter) as typeof query;
  }

  const snapshot = await query.get();
  const now = new Date();

  return snapshot.docs
    .map((doc) => doc.data() as UpcomingContest)
    .filter((c) => new Date(c.endTime) > now); // Extra safety: filter expired
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic, URL-safe ID for a contest.
 */
function generateContestId(platform: string, name: string, startTime: string): string {
  const slug = `${platform}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);

  // Append a hash of the start time for uniqueness
  const timeHash = simpleHash(startTime);
  return `${slug}-${timeHash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}
