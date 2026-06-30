/**
 * POST /api/leaderboard/contests/sync
 *
 * Refresh upcoming contests from Kontests API.
 * Triggered by Vercel Cron every 3 hours.
 */

import { NextResponse } from 'next/server';
import { syncUpcomingContests } from '@/server/leaderboard/contest.service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncUpcomingContests();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[contests/sync] Failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
