/**
 * POST /api/leaderboard/recalculate
 *
 * Force recalculate all ACM scores. Admin-only (core/adviser).
 * Used after changing scoring weights in Firestore.
 */

import { NextResponse } from 'next/server';
import { requirePermission } from '@/server/guard';
import { recalculateAllScores } from '@/server/leaderboard/scoring.service';

export async function POST(request: Request) {
  const auth = await requirePermission(request, 'manageLeaderboard');
  if (auth.error) return auth.error;

  try {
    const result = await recalculateAllScores();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[recalculate] Failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
