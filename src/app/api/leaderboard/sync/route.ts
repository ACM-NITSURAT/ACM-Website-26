/**
 * POST /api/leaderboard/sync
 *
 * Full background sync — fetches stats for all linked users.
 * Triggered by Vercel Cron every 6 hours.
 *
 * Protected by CRON_SECRET header verification.
 */

import { NextResponse } from 'next/server';
import { runFullSync } from '@/server/leaderboard/sync.service';

export const maxDuration = 300; // 5 minutes — Vercel Pro limit

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[sync] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[sync] Starting full sync...');
    const summary = await runFullSync();
    console.log(`[sync] Complete: ${summary.synced} synced, ${summary.skipped} skipped, ${summary.errors} errors`);

    return NextResponse.json({ success: true, summary });
  } catch (err) {
    console.error('[sync] Full sync failed:', err);
    return NextResponse.json(
      { error: 'Sync failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
