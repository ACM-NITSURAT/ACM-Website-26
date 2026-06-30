/**
 * GET /api/leaderboard/student/[slug]
 *
 * Returns full profile data for a single student.
 * Public endpoint — resolves slug to UID and returns all platform stats.
 */

import { NextResponse } from 'next/server';
import adminDb from '@/lib/firebase-admin/firestore';
import { FIRESTORE_PATHS } from '@/config/leaderboard';
import { extractRollFromSlug } from '@/lib/validators/roll-number-parser';
import type { LeaderboardEntry } from '@/schema/leaderboard';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    // Find the student by slug
    const snapshot = await adminDb
      .collection(FIRESTORE_PATHS.leaderboardCollection)
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const entry = snapshot.docs[0].data() as LeaderboardEntry;
      return NextResponse.json({ data: entry });
    }

    // Fallback: try extracting roll number from slug and searching by rollNumber
    const roll = extractRollFromSlug(slug);
    if (roll) {
      const rollSnapshot = await adminDb
        .collection(FIRESTORE_PATHS.leaderboardCollection)
        .where('rollNumber', '==', roll)
        .limit(1)
        .get();

      if (!rollSnapshot.empty) {
        const entry = rollSnapshot.docs[0].data() as LeaderboardEntry;
        return NextResponse.json({ data: entry });
      }
    }

    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  } catch (err) {
    console.error('[GET /api/leaderboard/student]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
