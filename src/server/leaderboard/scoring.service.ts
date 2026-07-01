/**
 * ACM Score calculation engine.
 *
 * Reads raw platform stats from /leaderboard/{uid}, normalizes them via
 * each platform's adapter, and computes a weighted ACM Score (0–100).
 *
 * Weights are read from Firestore /config/leaderboard. Falls back to
 * DEFAULT_WEIGHTS from src/config/leaderboard.ts if not configured.
 *
 * Scoring process:
 *  1. For each student, calculate per-platform normalized score (0–100)
 *  2. Multiply by configured weight for that platform
 *  3. Sum weighted scores → ACM Score
 *  4. Only count platforms the student has linked (adjust weights proportionally)
 *  5. Rank all students: overall, per-branch, per-year
 */

import adminDb from '@/lib/firebase-admin/firestore';
import { DEFAULT_WEIGHTS, FIRESTORE_PATHS, type Platform } from '@/config/leaderboard';
import { getAdapter } from './adapters/registry';
import type { LeaderboardEntry, LeaderboardConfig, AcmScore } from '@/schema/leaderboard';

// ── Config Loading ────────────────────────────────────────────────────────────

/**
 * Load scoring weights from Firestore. Falls back to hardcoded defaults.
 */
async function loadWeights(): Promise<Record<Platform, number>> {
  try {
    const configSnap = await adminDb.doc(FIRESTORE_PATHS.configDoc).get();
    if (configSnap.exists) {
      const config = configSnap.data() as Partial<LeaderboardConfig>;
      if (config.weights) {
        return config.weights as Record<Platform, number>;
      }
    }
  } catch (err) {
    console.warn('[scoring] Failed to load weights from Firestore, using defaults:', err);
  }

  return { ...DEFAULT_WEIGHTS };
}

// ── Score Calculation ─────────────────────────────────────────────────────────

/**
 * Calculate ACM Score for a single student.
 * Returns the raw score (0–100) without rank information.
 */
function calculateAcmScore(
  entry: LeaderboardEntry,
  weights: Record<Platform, number>,
): number {
  const platforms: Platform[] = ['leetcode', 'codeforces', 'codechef', 'github'];

  let totalWeight = 0;
  let weightedSum = 0;

  for (const platform of platforms) {
    const stats = entry[platform];
    if (!stats) continue; // Skip unlinked platforms

    const adapter = getAdapter(platform);
    const normalizedScore = adapter.calculateNormalizedScore(stats);
    const weight = weights[platform] ?? 0;

    weightedSum += normalizedScore * weight;
    totalWeight += weight;
  }

  // If no platforms are linked, score is 0
  if (totalWeight === 0) return 0;

  // Normalize by total linked weight so students aren't penalized
  // for not linking all platforms
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

// ── Rank Calculation ──────────────────────────────────────────────────────────

interface RankEntry {
  uid: string;
  score: number;
  branch: string;
  currentYear: number;
}

/**
 * Compute ranks for all students.
 * Returns a map of uid → { overallRank, branchRank, yearRank }.
 */
function computeRanks(entries: RankEntry[]): Map<string, Pick<AcmScore, 'overallRank' | 'branchRank' | 'yearRank'>> {
  const ranks = new Map<string, Pick<AcmScore, 'overallRank' | 'branchRank' | 'yearRank'>>();

  // Sort by score descending
  const sorted = [...entries].sort((a, b) => b.score - a.score);

  // Overall rank
  const overallRanks = new Map<string, number>();
  sorted.forEach((entry, index) => {
    overallRanks.set(entry.uid, index + 1);
  });

  // Branch rank
  const byBranch = new Map<string, RankEntry[]>();
  for (const entry of sorted) {
    const group = byBranch.get(entry.branch) ?? [];
    group.push(entry);
    byBranch.set(entry.branch, group);
  }

  const branchRanks = new Map<string, number>();
  for (const [, group] of byBranch) {
    group.forEach((entry, index) => {
      branchRanks.set(entry.uid, index + 1);
    });
  }

  // Year rank
  const byYear = new Map<number, RankEntry[]>();
  for (const entry of sorted) {
    const group = byYear.get(entry.currentYear) ?? [];
    group.push(entry);
    byYear.set(entry.currentYear, group);
  }

  const yearRanks = new Map<string, number>();
  for (const [, group] of byYear) {
    group.forEach((entry, index) => {
      yearRanks.set(entry.uid, index + 1);
    });
  }

  // Combine
  for (const entry of entries) {
    ranks.set(entry.uid, {
      overallRank: overallRanks.get(entry.uid) ?? 0,
      branchRank: branchRanks.get(entry.uid) ?? 0,
      yearRank: yearRanks.get(entry.uid) ?? 0,
    });
  }

  return ranks;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Recalculate ACM scores and ranks for ALL students.
 * Called after a full sync or when weights are changed.
 */
export async function recalculateAllScores(): Promise<{ updated: number }> {
  const weights = await loadWeights();

  // Fetch all leaderboard entries
  const snapshot = await adminDb.collection(FIRESTORE_PATHS.leaderboardCollection).get();
  if (snapshot.empty) return { updated: 0 };

  const entries: Array<{ uid: string; entry: LeaderboardEntry; score: number }> = [];

  for (const doc of snapshot.docs) {
    const entry = doc.data() as LeaderboardEntry;
    const score = calculateAcmScore(entry, weights);
    entries.push({ uid: doc.id, entry, score });
  }

  // Compute ranks
  const rankEntries: RankEntry[] = entries.map((e) => ({
    uid: e.uid,
    score: e.score,
    branch: e.entry.branch,
    currentYear: e.entry.currentYear,
  }));

  const ranks = computeRanks(rankEntries);

  // Batch write scores + ranks in chunks of 400 (Firestore limit is 500)
  const CHUNK_SIZE = 400;
  const now = new Date().toISOString();

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const batch = adminDb.batch();
    const chunk = entries.slice(i, i + CHUNK_SIZE);

    for (const { uid, score } of chunk) {
      const rank = ranks.get(uid);
      const acm: AcmScore = {
        score,
        overallRank: rank?.overallRank ?? 0,
        branchRank: rank?.branchRank ?? 0,
        yearRank: rank?.yearRank ?? 0,
        lastCalculated: now,
      };

      const ref = adminDb.doc(FIRESTORE_PATHS.leaderboardDoc(uid));
      batch.update(ref, { acm });
    }

    await batch.commit();
  }

  return { updated: entries.length };
}

/**
 * Recalculate ACM score for a single user.
 * Used after manual refresh. Rank is approximate (based on current data).
 */
export async function recalculateUserScore(uid: string): Promise<AcmScore | null> {
  const weights = await loadWeights();

  const entrySnap = await adminDb.doc(FIRESTORE_PATHS.leaderboardDoc(uid)).get();
  if (!entrySnap.exists) return null;

  const entry = entrySnap.data() as LeaderboardEntry;
  const score = calculateAcmScore(entry, weights);

  // For single user, we need all entries to compute accurate ranks
  const allSnap = await adminDb.collection(FIRESTORE_PATHS.leaderboardCollection).get();
  const allEntries: RankEntry[] = [];

  for (const doc of allSnap.docs) {
    const data = doc.data() as LeaderboardEntry;
    allEntries.push({
      uid: doc.id,
      score: doc.id === uid ? score : data.acm.score,
      branch: data.branch,
      currentYear: data.currentYear,
    });
  }

  const ranks = computeRanks(allEntries);
  const rank = ranks.get(uid);

  const acm: AcmScore = {
    score,
    overallRank: rank?.overallRank ?? 0,
    branchRank: rank?.branchRank ?? 0,
    yearRank: rank?.yearRank ?? 0,
    lastCalculated: new Date().toISOString(),
  };

  await adminDb.doc(FIRESTORE_PATHS.leaderboardDoc(uid)).update({ acm });

  return acm;
}
