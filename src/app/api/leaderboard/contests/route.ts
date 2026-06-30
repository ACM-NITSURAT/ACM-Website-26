/**
 * GET /api/leaderboard/contests
 *
 * Returns upcoming contests. Public endpoint.
 *
 * Query params:
 *   platform — optional filter by platform name
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getUpcomingContests } from '@/server/leaderboard/contest.service';

export async function GET(request: NextRequest) {
  try {
    const platform = request.nextUrl.searchParams.get('platform') ?? undefined;
    const contests = await getUpcomingContests(platform);

    return NextResponse.json({ data: contests });
  } catch (err) {
    console.error('[GET /api/leaderboard/contests]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
