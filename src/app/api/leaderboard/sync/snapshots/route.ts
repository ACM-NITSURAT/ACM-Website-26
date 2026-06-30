/**
 * POST /api/leaderboard/sync/snapshots
 *
 * Weekly snapshot trigger — saves current stats for delta computation.
 * Triggered by Vercel Cron every Sunday at midnight UTC.
 */

import { NextResponse } from 'next/server';
import { takeWeeklySnapshots } from '@/server/leaderboard/snapshot.service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await takeWeeklySnapshots();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[snapshots] Failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export const POST = GET;
