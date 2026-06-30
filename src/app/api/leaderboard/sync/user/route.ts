/**
 * POST /api/leaderboard/sync/user
 *
 * Manual "Refresh Stats" for a single user.
 * Requires authentication. Enforces 30-minute cooldown.
 *
 * Body: { idToken: string }
 */

import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin/auth';
import { syncUserByUid } from '@/server/leaderboard/sync.service';
import { isStaleMinutes } from '@/server/leaderboard/utils';
import { MANUAL_REFRESH_COOLDOWN_MINUTES, FIRESTORE_PATHS } from '@/config/leaderboard';
import adminDb from '@/lib/firebase-admin/firestore';
import type { LeaderboardEntry } from '@/schema/leaderboard';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const token = await verifyIdToken(idToken);
    const uid = token.uid;

    // Check cooldown
    const leaderboardSnap = await adminDb.doc(FIRESTORE_PATHS.leaderboardDoc(uid)).get();
    if (leaderboardSnap.exists) {
      const existing = leaderboardSnap.data() as LeaderboardEntry;
      if (!isStaleMinutes(existing.sync?.lastManualRefresh, MANUAL_REFRESH_COOLDOWN_MINUTES)) {
        const minutesLeft = MANUAL_REFRESH_COOLDOWN_MINUTES -
          Math.floor((Date.now() - new Date(existing.sync.lastManualRefresh!).getTime()) / 60_000);
        return NextResponse.json(
          { error: `Please wait ${minutesLeft} more minute(s) before refreshing again.` },
          { status: 429 },
        );
      }
    }

    const result = await syncUserByUid(uid);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('[sync/user] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 },
    );
  }
}
