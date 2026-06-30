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
import { fetchJsonWithRetry, postJsonWithRetry } from './utils';
import type { UpcomingContest } from '@/schema/leaderboard';

// ── Fetch & Store ─────────────────────────────────────────────────────────────

/**
 * Fetch upcoming contests directly from platforms (Codeforces, LeetCode, CodeChef).
 * Automatically cleans up expired contests.
 */
export async function syncUpcomingContests(): Promise<{ added: number; removed: number }> {
  const now = new Date();
  const contests: UpcomingContest[] = [];

  // 1. Fetch Codeforces
  try {
    const cfRes = await fetchJsonWithRetry<any>('https://codeforces.com/api/contest.list?gym=false');
    if (cfRes.data?.result) {
      const upcoming = cfRes.data.result.filter((c: any) => c.phase === 'BEFORE');
      for (const raw of upcoming) {
        const startTime = new Date(raw.startTimeSeconds * 1000);
        const endTime = new Date((raw.startTimeSeconds + raw.durationSeconds) * 1000);
        contests.push({
          id: generateContestId('codeforces', raw.name, startTime.toISOString()),
          platform: 'codeforces',
          name: raw.name,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: raw.durationSeconds,
          url: `https://codeforces.com/contests/${raw.id}`,
          isActive: false, // it's 'BEFORE'
          lastFetched: now.toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('[sync] CF contests failed:', err);
  }

  // 2. Fetch LeetCode
  try {
    const lcRes = await postJsonWithRetry<any>('https://leetcode.com/graphql', {
      query: 'query { topTwoContests { title titleSlug startTime duration } }',
    });
    if (lcRes.data?.data?.topTwoContests) {
      for (const raw of lcRes.data.data.topTwoContests) {
        const startTime = new Date(raw.startTime * 1000);
        const endTime = new Date((raw.startTime + raw.duration) * 1000);
        if (endTime <= now) continue;
        contests.push({
          id: generateContestId('leetcode', raw.title, startTime.toISOString()),
          platform: 'leetcode',
          name: raw.title,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: raw.duration,
          url: `https://leetcode.com/contest/${raw.titleSlug}`,
          isActive: startTime <= now && endTime > now,
          lastFetched: now.toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('[sync] LC contests failed:', err);
  }

  // 3. Fetch CodeChef
  try {
    const ccRes = await fetchJsonWithRetry<any>('https://www.codechef.com/api/list/contests/all');
    if (ccRes.data?.future_contests) {
      for (const raw of ccRes.data.future_contests) {
        const startTime = new Date(raw.contest_start_date_iso);
        const endTime = new Date(raw.contest_end_date_iso);
        if (endTime <= now) continue;
        contests.push({
          id: generateContestId('codechef', raw.contest_name, startTime.toISOString()),
          platform: 'codechef',
          name: raw.contest_name,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: parseInt(raw.contest_duration, 10) * 60, // CC returns duration in mins usually, wait, from node it was "180" for a 3 hr contest. So * 60 to get seconds.
          url: `https://www.codechef.com/${raw.contest_code}`,
          isActive: startTime <= now && endTime > now,
          lastFetched: now.toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('[sync] CC contests failed:', err);
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
