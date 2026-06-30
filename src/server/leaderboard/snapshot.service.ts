/**
 * Weekly snapshot service.
 *
 * Saves a snapshot of each student's key stats every Sunday.
 * Used to compute weekly deltas: "▲ +76 CF", "▲ +12 ACM".
 *
 * Triggered by Vercel Cron: 0 0 * * 0 (Sunday midnight UTC).
 *
 * The latest snapshot is stored inline on the leaderboard entry (lastSnapshot)
 * for fast delta display. Historical snapshots are stored in a separate
 * collection (/leaderboard_snapshots) for future trend analysis.
 */

import adminDb from '@/lib/firebase-admin/firestore';
import { FIRESTORE_PATHS } from '@/config/leaderboard';
import { getISOWeekId } from './utils';
import type { LeaderboardEntry, WeeklySnapshot, SnapshotRecord } from '@/schema/leaderboard';

/**
 * Take weekly snapshots for all students.
 * Moves current `lastSnapshot` to `previousSnapshot`, then saves fresh data.
 */
export async function takeWeeklySnapshots(): Promise<{ snapshotCount: number }> {
  const weekId = getISOWeekId();
  const collection = adminDb.collection(FIRESTORE_PATHS.leaderboardCollection);
  const snapshot = await collection.get();

  if (snapshot.empty) return { snapshotCount: 0 };

  const batch = adminDb.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const entry = doc.data() as LeaderboardEntry;

    const weeklySnapshot: WeeklySnapshot = {
      weekOf: weekId,
      cfRating: entry.codeforces?.currentRating ?? null,
      lcRating: entry.leetcode?.rating ?? null,
      ccRating: entry.codechef?.currentRating ?? null,
      ghCommits: entry.github?.totalCommits ?? null,
      acmScore: entry.acm.score,
    };

    // Update the leaderboard doc: shift current → previous, save new
    batch.update(doc.ref, {
      previousSnapshot: entry.lastSnapshot ?? null,
      lastSnapshot: weeklySnapshot,
    });

    // Also save to historical snapshots collection
    const snapshotRecord: SnapshotRecord = {
      uid: doc.id,
      weekId,
      snapshot: weeklySnapshot,
    };

    const snapshotRef = adminDb.doc(FIRESTORE_PATHS.snapshotDoc(doc.id, weekId));
    batch.set(snapshotRef, snapshotRecord);

    count++;
  }

  await batch.commit();

  return { snapshotCount: count };
}
